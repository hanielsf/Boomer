import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Inbox, Clock, Coffee, CheckCircle, Search, Filter, X, User, Calendar } from 'lucide-react';
import './KanbanBoard.css';

const KanbanBoard = ({ tickets, tags, onTicketMove, onTicketClick }) => {
  const [columns, setColumns] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ priority: '', assignee: '' });

  const getColumnIcon = (columnId) => {
    switch(columnId) {
      case 'inbox': return <Inbox size={18} />;
      case 'not-started': return <Clock size={18} />;
      case 'in-progress': return <Coffee size={18} />;
      case 'done': return <CheckCircle size={18} />;
      default: return null;
    }
  };

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

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = ticket.id.toString().includes(searchTerm) ||
                            ticket.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            ticket.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = !filters.priority || ticket.priority === filters.priority;
      const matchesAssignee = !filters.assignee || ticket.assignee === filters.assignee;

      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tickets, searchTerm, filters]);

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

  const getTicketColor = (ticket) => {
    switch(ticket.priority) {
      case 'Alta': return '#FF4136';
      case 'Média': return '#FF851B';
      case 'Baixa': return '#2ECC40';
      default: return '#7FDBFF';
    }
  };

  const renderTicket = (ticket, provided) => {
    const ticketColor = getTicketColor(ticket);
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        onClick={() => onTicketClick(ticket)}
        className="ticket"
        style={{
          ...provided.draggableProps.style,
          borderLeft: `5px solid ${ticketColor}`,
        }}
      >
        <div className="ticket-header">
          <span className="ticket-id">#{ticket.id}</span>
          <span className="ticket-priority" style={{ backgroundColor: ticketColor }}>{ticket.priority}</span>
        </div>
        <div className="ticket-content">
          <div className="ticket-title">{truncateText(ticket.contact_name || 'Nome não disponível', 30)}</div>
          <div className="ticket-message">{truncateText(ticket.lastMessage, 50)}</div>
        </div>
        <div className="ticket-footer">
          <div className="ticket-assignee">
            <User size={14} />
            <span>{truncateText(ticket.assignee, 20)}</span>
          </div>
          <div className="ticket-tags">
            {ticket.tags && ticket.tags.map(tag => (
              <span key={tag.id} className="ticket-tag" style={{ backgroundColor: tag.color }}>
                {truncateText(tag.tag, 10)}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const truncateText = (text, maxLength) => {
    if (!text) return ''; // Verifica se o texto está definido
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  return (
    <div className="kanban-board">
      <div className="kanban-filters">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          value={filters.priority}
          onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
          className="filter-select"
        >
          <option value="">Todas as prioridades</option>
          <option value="Alta">Alta</option>
          <option value="Média">Média</option>
          <option value="Baixa">Baixa</option>
        </select>
        <select
          value={filters.assignee}
          onChange={(e) => setFilters(prev => ({ ...prev, assignee: e.target.value }))}
          className="filter-select"
        >
          <option value="">Todos os responsáveis</option>
          {/* Adicione opções para os responsáveis aqui */}
        </select>
      </div>
      {(searchTerm || filters.priority || filters.assignee) && (
        <div className="active-filters">
          Filtros ativos:
          {searchTerm && (
            <span className="filter-tag">
              Busca: {searchTerm}
              <X size={14} onClick={() => setSearchTerm('')} className="remove-filter" />
            </span>
          )}
          {filters.priority && (
            <span className="filter-tag">
              Prioridade: {filters.priority}
              <X size={14} onClick={() => setFilters(prev => ({ ...prev, priority: '' }))} className="remove-filter" />
            </span>
          )}
          {filters.assignee && (
            <span className="filter-tag">
              Responsável: {filters.assignee}
              <X size={14} onClick={() => setFilters(prev => ({ ...prev, assignee: '' }))} className="remove-filter" />
            </span>
          )}
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-columns">
          {Object.values(columns).map(column => (
            <Droppable key={column.id} droppableId={column.id.toString()}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="kanban-column"
                >
                  <h3 className="column-header" style={{ color: column.color }}>
                    {getColumnIcon(column.id)}
                    <span>{column.title}</span>
                    <span className="column-count" style={{ backgroundColor: column.color }}>
                      {column.ticketIds.filter(id => filteredTickets.some(ticket => ticket.id.toString() === id.toString())).length}
                    </span>
                  </h3>
                  <div className="column-content">
                    {column.ticketIds
                        .filter(id => filteredTickets.some(ticket => ticket.id.toString() === id.toString()))
                        .map((ticketId, index) => {
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
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;