import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";
import socketEmit from "../../helpers/socketEmit";
import CreateLogTicketService from "./CreateLogTicketService";

interface Request {
  ticketId: number;
  tagId: number;
  tenantId: number | string;
}

const UpdateTicketTagService = async ({
  ticketId,
  tagId,
  tenantId
}: Request): Promise<Ticket> => {
  const ticket = await Ticket.findOne({
    where: {
      id: ticketId,
      tenantId
    },
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "tag", "color"]
      }
    ]
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const tag = await Tag.findByPk(tagId);

  if (!tag) {
    throw new Error("Tag not found");
  }

  // Use o método set da associação
  await ticket.$set('tags', [tag]);

  await ticket.reload({
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "tag", "color"]
      }
    ]
  });

  await CreateLogTicketService({
    ticketId: ticket.id,
    type: "updateTag"
  });

  socketEmit({
    tenantId,
    type: "ticket:update",
    payload: ticket
  });

  return ticket;
};

export default UpdateTicketTagService;