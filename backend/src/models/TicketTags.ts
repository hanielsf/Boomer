import { Table, Column, Model, PrimaryKey, ForeignKey, CreatedAt, UpdatedAt } from "sequelize-typescript";
import Ticket from "./Ticket";
import Tags from "./Tag";

@Table({
  tableName: 'ticket_tags',  // Especifica o nome da tabela
  timestamps: true  // Ativa createdAt e updatedAt automaticamente
})
class TicketTags extends Model<TicketTags> {
  @PrimaryKey
  @ForeignKey(() => Ticket)
  @Column({ field: 'ticket_id' }) // Nome da coluna no banco de dados
  ticketId: number;

  @PrimaryKey
  @ForeignKey(() => Tags) // Corrigido para a classe de Tag
  @Column({ field: 'tag_id' }) // Nome da coluna no banco de dados
  tagId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketTags;
