// src/features/group/components/DiskModal.jsx
import React from 'react';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import { PlusCircleFill, TrashFill } from 'react-bootstrap-icons';
import { useSelector, useDispatch } from 'react-redux';
import { updateFormData } from '../groupSlice';
import { 
  fetchGroup,
  fetchBrands,
  fetchModuli,
  fetchIntegrazioni,
  saveGroup,
  recalcServerProposal
} from '../groupThunks'; 
const DiskModal = ({ show, handleClose }) => {
  const dispatch = useDispatch();
  const { formData, currentServerIndex } = useSelector(state => state.group);

  const handleDiskChange = (serverIndex, diskIndex, e) => {
    const { name, value } = e.target;
    // Aggiorna manualmente la struttura dei dischi
    const newServerList = formData.infrastructure.server_list.map((server, i) => {
      if (i === serverIndex) {
        const newDiskList = server.disk_list.map((disk, j) =>
          j === diskIndex ? { ...disk, [name]: value } : disk
        );
        return { ...server, disk_list: newDiskList };
      }
      return server;
    });
    dispatch(updateFormData({ infrastructure: { ...formData.infrastructure, server_list: newServerList } }));
  };

  const handleAddDisk = (serverIndex) => {
    const newServerList = formData.infrastructure.server_list.map((server, i) => {
      if (i === serverIndex) {
        return { ...server, disk_list: [...(server.disk_list || []), { letter: '', size: '' }] };
      }
      return server;
    });
    dispatch(updateFormData({ infrastructure: { ...formData.infrastructure, server_list: newServerList } }));
  };

  const handleRemoveDisk = (serverIndex, diskIndex) => {
    const newServerList = formData.infrastructure.server_list.map((server, i) => {
      if (i === serverIndex) {
        return { ...server, disk_list: server.disk_list.filter((_, j) => j !== diskIndex) };
      }
      return server;
    });
    dispatch(updateFormData({ infrastructure: { ...formData.infrastructure, server_list: newServerList } }));
  };

  return (
    <Modal show={show} onHide={() => handleClose(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Gestisci Dischi</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formData?.infrastructure?.server_list?.[currentServerIndex]?.disk_list?.map((disk, diskIndex) => (
          <div key={diskIndex} className="mb-3">
            <Row className="align-items-center">
              <Col md={5}>
                <label htmlFor={`letter_${currentServerIndex}_${diskIndex}`} className="form-label text-secondary">
                  <small>Lettera</small>
                </label>
                <input
                  type="text"
                  id={`letter_${currentServerIndex}_${diskIndex}`}
                  name="letter"
                  className="form-control"
                  value={disk.letter}
                  onChange={(e) => handleDiskChange(currentServerIndex, diskIndex, e)}
                />
              </Col>
              <Col md={5}>
                <label htmlFor={`size_${currentServerIndex}_${diskIndex}`} className="form-label text-secondary">
                  <small>Dimensione</small>
                </label>
                <input
                  type="text"
                  id={`size_${currentServerIndex}_${diskIndex}`}
                  name="size"
                  className="form-control"
                  value={disk.size}
                  onChange={(e) => handleDiskChange(currentServerIndex, diskIndex, e)}
                />
              </Col>
              <Col md={2} className="text-end">
                <label htmlFor={`elimina_${currentServerIndex}_${diskIndex}`} className="form-label text-secondary">
                  <small>Elimina</small>
                </label>
                <button
                  type="button"
                  className="btn btn-link text-danger"
                  onClick={() => handleRemoveDisk(currentServerIndex, diskIndex)}
                >
                  <TrashFill />
                </button>
              </Col>
            </Row>
          </div>
        ))}
        <button type="button" className="btn btn-link text-primary" onClick={() => handleAddDisk(currentServerIndex)}>
          <PlusCircleFill className="mr-2" />Aggiungi Disco
        </button>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => handleClose(false)}>
          Chiudi
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DiskModal;
