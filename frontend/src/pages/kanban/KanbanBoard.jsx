import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const KanbanBoard = ({ tickets, tags, onTicketMove }) => {
  const [columns, setColumns] = useState({});

  useEffect(() => {
    const initialColumns = tags.reduce((acc, tag) => {
      acc[tag.id] = {
        id: tag.id,
        title: tag.tag,
        color: tag.color,
        ticketIds: [],
      };
      return acc;
    }, {});

    tickets.forEach(ticket => {
      if (ticket.tags && ticket.tags.length > 0) {
        ticket.tags.forEach(tag => {
          if (initialColumns[tag.id]) {
            initialColumns[tag.id].ticketIds.push(ticket.id);
          }
        });
      } else {
        if (!initialColumns['no-tag']) {
          initialColumns['no-tag'] = {
            id: 'no-tag',
            title: 'Sem Etiqueta',
            color: '#cccccc',
            ticketIds: [],
          };
        }
        initialColumns['no-tag'].ticketIds.push(ticket.id);
      }
    });

    setColumns(initialColumns);
  }, [tickets, tags]);

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

    const start = columns[source.droppableId];
    const finish = columns[destination.droppableId];

    if (start === finish) {
      const newTicketIds = Array.from(start.ticketIds);
      newTicketIds.splice(source.index, 1);
      newTicketIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...start,
        ticketIds: newTicketIds,
      };

      setColumns({
        ...columns,
        [newColumn.id]: newColumn,
      });
    } else {
      const startTicketIds = Array.from(start.ticketIds);
      startTicketIds.splice(source.index, 1);
      const newStart = {
        ...start,
        ticketIds: startTicketIds,
      };

      const finishTicketIds = Array.from(finish.ticketIds);
      finishTicketIds.splice(destination.index, 0, draggableId);
      const newFinish = {
        ...finish,
        ticketIds: finishTicketIds,
      };

      setColumns({
        ...columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      });

      onTicketMove(draggableId, destination.droppableId);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', overflowX: 'auto', padding: '1rem', gap: '1rem' }}>
        {Object.values(columns).map(column => (
          <Droppable key={column.id} droppableId={column.id.toString()}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ background: '#f0f0f0', padding: '0.5rem', borderRadius: '0.25rem', minWidth: '250px' }}
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
                  return (
                    <Draggable key={ticketId} draggableId={ticketId.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            backgroundColor: 'white',
                            marginBottom: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 'semibold' }}>#{ticket.id}</span>
                            <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e0e0e0', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                              {ticket.status}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{ticket.lastMessage}</p>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', marginRight: '0.5rem', overflow: 'hidden' }}>
                              <img src={ticket.contact.profilePicUrl || '/placeholder.jpg'} alt={ticket.contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem' }}>{ticket.contact.name}</span>
                          </div>
                          <div style={{ marginTop: '0.5rem' }}>
                            {ticket.tags.map(tag => (
                              <span key={tag.id} style={{ 
                                backgroundColor: tag.color, 
                                color: 'white', 
                                padding: '0.25rem 0.5rem', 
                                borderRadius: '0.25rem', 
                                marginRight: '0.25rem',
                                fontSize: '0.75rem'
                              }}>
                                {tag.tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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