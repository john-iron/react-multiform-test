# React/Redux Advanced Form & Business Logic Engine

This project showcases a sophisticated multi-step form management feature built with React, Redux Toolkit, and a custom business logic engine. It's designed to handle complex data entry, asynchronous validation, and dynamic UI updates based on a powerful rules engine.

This is not a simple "to-do" app, but a real-world example of building a scalable and maintainable front-end feature for a complex business application.

[Link to Live Demo (if available)] | [Link to your Portfolio]

## Core Features

*   **Multi-Step Wizard Interface:** A tab-based navigation system (`group`, `companies`, `servers`) guides the user through a complex data entry process.
*   **Dynamic Form Management:** Users can dynamically add and remove complex data structures, such as companies and their associated brands.
*   **Asynchronous Validation:** The application performs real-time, asynchronous validation for critical fields like a company's VAT number (`p_iva`) to check for duplicates against the backend.
*   **Data Import/Export:** A modal allows users to import application state from a JSON file, streamlining data entry from external sources.
*   **Decoupled Business Logic Engine:** A dedicated rules engine (`serverProposalEngine.js`) processes the collected data (`facts`) and dynamically calculates infrastructure requirements (e.g., server configurations) based on a set of predefined rules.
*   **Responsive and Interactive UI:** The interface provides immediate feedback, uses tooltips and modals for a better user experience, and leverages libraries like `react-bootstrap` and `react-toastify`.

## Technical Architecture & Highlights

This project was built with a strong emphasis on **Separation of Concerns**, resulting in a codebase that is clean, scalable, and highly maintainable.

### 1. Clear Architectural Boundaries

The application is cleanly divided into distinct layers:

*   **UI Components (`/components`)**: Purely responsible for rendering the UI and capturing user events. They are "dumb" components that delegate all logic to Redux.
    *   `DataManager.js`: The main container that orchestrates the tabs and form flow.
    *   `CompaniesManager.js`, `ServersManager.js`: Complex components for managing specific data entities.
    *   `DiskModal.js`, `ImportModal.js`: Reusable modal components for specific actions.

*   **State Management (`/groupSlice.js`, `/groupThunks.js`)**: Centralized state logic using **Redux Toolkit**.
    *   `groupSlice.js`: Defines the state shape, reducers, and synchronous actions.
    *   `groupThunks.js`: Manages all asynchronous logic, including API calls to fetch initial data, save the form, and perform validations.

*   **Business Logic (`serverProposalEngine.js`, `groupUtils.js`, `serverCreationUtils.js`)**: The "brain" of the application. This layer is completely decoupled from React and the UI.
    *   `serverProposalEngine.js`: Implements a rules engine using `json-rules-engine` to process facts and produce a list of required servers.
    *   `groupUtils.js`, `serverCreationUtils.js`: Contain pure helper functions for data transformation, calculations, and building application state. This code is highly testable.

### 2. Modern React & Redux Practices

*   **Redux Toolkit:** Utilizes `createSlice` and `createAsyncThunk` to significantly reduce boilerplate and implement best practices for asynchronous state management.
*   **Advanced React Hooks:** Demonstrates proficient use of hooks beyond the basics:
    *   `useMemo` is used in `ServersManager.js` to optimize performance by memoizing derived data.
    *   A **custom hook (`useRoleOptions`)** is created to encapsulate and reuse complex logic for generating dynamic form options.
*   **Asynchronous Flow Control:** Cleanly handles loading states, error reporting, and UI updates based on the lifecycle of async thunks (`pending`, `fulfilled`, `rejected`).

### 3. Professional Development Workflow

*   **API Abstraction:** All API endpoints are abstracted via a `CONFIG` object, ensuring no hardcoded URLs are present in the code.
*   **Clean Code:** The code is well-structured, consistently formatted, and uses descriptive naming for variables and functions, making it easy to read and understand.
*   **Robust Error Handling:** Utilizes `try...catch` blocks in thunks and `rejectWithValue` to provide meaningful error messages to the UI and state.

## How to Run This Project

1.  **Clone the repository:**
    ```bash
    git clone [your-repo-url]
    cd [repo-folder]
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm start
    ```
    The application will be available at `http://localhost:3000`.

## Potential Future Improvements

This codebase provides a solid foundation. The next logical steps to enhance it would be:

*   **Unit & Integration Testing:** The decoupled architecture makes the business logic in `groupUtils.js` and `serverProposalEngine.js` easily testable with **Jest/Vitest**. Components could be tested with **React Testing Library** to simulate user interactions and verify behavior.
*   **Form Management Library:** For even more complex forms, migrating the form state and validation logic to a dedicated library like **React Hook Form** with **Zod/Yup** for schema validation would further improve maintainability.
*   **TypeScript Migration:** Introducing TypeScript would add strong typing to the `formData` object, Redux actions, and component props, catching potential bugs at compile-time and improving the developer experience.
