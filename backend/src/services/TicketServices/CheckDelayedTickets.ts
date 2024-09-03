import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";

const checkDelayedTickets = async (): Promise<void> => {
  const delayedTag = await Tag.findOne({ where: { name: "Atrasado" } });
  
  if (!delayedTag) {
    console.log("Tag 'Atrasado' não encontrada");
    return;
  }

  const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

  const ticketsToUpdate = await Ticket.findAll({
    where: {
      status: "pending",
      createdAt: { [Op.lt]: twentyMinutesAgo },
      "$tags.id$": { [Op.ne]: delayedTag.id }
    },
    include: [{ model: Tag, as: "tags" }]
  });

  for (const ticket of ticketsToUpdate) {
    await ticket.addTag(delayedTag);
  }

  console.log(`${ticketsToUpdate.length} tickets marcados como atrasados`);
};

export default checkDelayedTickets;