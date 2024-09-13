import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const KanbanBoard = ({ tickets, tags, onTicketMove, onTicketClick }) => {
  const [columns, setColumns] = useState({});

  const initializeColumns = useCallback(() => {
    const initialColumns = tags.reduce((acc, tag) => {
      acc[tag.id] = {
        id: tag.id,
        title: tag.tag,
        color: tag.color,
        ticketIds: [],
      };
      return acc;
    }, {});

    initialColumns['no-tag'] = {
      id: 'no-tag',
      title: 'Sem Etiqueta',
      color: '#cccccc',
      ticketIds: [],
    };

    tickets.forEach(ticket => {
      if (ticket.tags && ticket.tags.length > 0) {
        ticket.tags.forEach(tag => {
          if (initialColumns[tag.id]) {
            initialColumns[tag.id].ticketIds.push(ticket.id);
          }
        });
      } else {
        initialColumns['no-tag'].ticketIds.push(ticket.id);
      }
    });

    setColumns(initialColumns);
  }, [tickets, tags]);

  useEffect(() => {
    initializeColumns();
  }, [initializeColumns]);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const startColumn = columns[source.droppableId];
    const finishColumn = columns[destination.droppableId];

    if (startColumn === finishColumn) {
      const newTicketIds = Array.from(startColumn.ticketIds);
      newTicketIds.splice(source.index, 1);
      newTicketIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...startColumn,
        ticketIds: newTicketIds,
      };

      setColumns({
        ...columns,
        [newColumn.id]: newColumn,
      });
    } else {
      const startTicketIds = Array.from(startColumn.ticketIds);
      startTicketIds.splice(source.index, 1);
      const newStartColumn = {
        ...startColumn,
        ticketIds: startTicketIds,
      };

      const finishTicketIds = Array.from(finishColumn.ticketIds);
      finishTicketIds.splice(destination.index, 0, draggableId);
      const newFinishColumn = {
        ...finishColumn,
        ticketIds: finishTicketIds,
      };

      setColumns({
        ...columns,
        [newStartColumn.id]: newStartColumn,
        [newFinishColumn.id]: newFinishColumn,
      });

      const ticketId = parseInt(draggableId, 10);
      const newTagId = destination.droppableId === 'no-tag' ? null : parseInt(destination.droppableId, 10);

      onTicketMove(ticketId, newTagId);
    }
  };

  const renderTicket = (ticket, provided) => (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => onTicketClick(ticket)}
      style={{
        backgroundColor: 'white',
        marginBottom: '0.5rem',
        padding: '0.5rem',
        borderRadius: '0.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        cursor: 'pointer',
        ...provided.draggableProps.style
      }}
    >
      <div style={{ fontWeight: 'bold' }}>#{ticket.id}</div>
      <div>{ticket.contact?.name || 'Nome não disponível'}</div>
      <div style={{ fontSize: '0.8em', color: '#666' }}>{ticket.lastMessage}</div>
      <div style={{ fontSize: '0.8em', color: '#666' }}>Status: {ticket.status}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {ticket.tags && ticket.tags.map(tag => (
          <span key={tag.id} style={{
            backgroundColor: tag.color,
            color: 'white',
            padding: '0.1rem 0.3rem',
            borderRadius: '0.25rem',
            fontSize: '0.7em',
            marginRight: '0.2rem',
            marginBottom: '0.2rem'
          }}>
            {tag.tag}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', overflowX: 'auto', padding: '1rem', gap: '1rem' }}>
        {Object.values(columns).map(column => (
          <Droppable key={column.id} droppableId={column.id.toString()}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  background: '#f0f0f0',
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  minWidth: '250px',
                  maxWidth: '250px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', marginRight: '0.5rem', backgroundColor: column.color }}></div>
                  {column.title}
                  <span style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: '#e0e0e0', borderRadius: '0.25rem' }}>
                    {column.ticketIds.length}
                  </span>
                </h3>
                {column.ticketIds.map((ticketId, index) => {
                  const ticket = tickets.find(t => t.id.toString() === ticketId.toString());
                  if (!ticket) return null;
                  return (
                    <Draggable key={ticketId} draggableId={ticketId.toString()} index={index}>
                      {(provided) => renderTicket(ticket, provided)}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;