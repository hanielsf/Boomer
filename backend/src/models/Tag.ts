import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  AutoIncrement,
  Default
} from "sequelize-typescript";
import Tenant from "./Tenant";
import User from "./User";
import TicketTags from "./TicketTags";
import Ticket from "./Ticket";

@Table
class Tags extends Model<Tags> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  tag: string;

  @Column
  color: string;

  @Default(true)
  @Column
  isActive: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Tenant)
  @Column
  tenantId: number;

  @BelongsToMany(() => Ticket, () => TicketTags)
  tickets: Ticket[];

  @BelongsTo(() => Tenant)
  tenant: Tenant;
}

export default Tags;
