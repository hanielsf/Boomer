/* eslint-disable eqeqeq */
import { QueryTypes } from "sequelize";
// import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import UsersQueues from "../../models/UsersQueues";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
// import ListSettingsService from "../SettingServices/ListSettingsService";
// import Queue from "../../models/Queue";
// import ListSettingsService from "../SettingServices/ListSettingsService";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string[];
  date?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  isNotAssignedUser?: string;
  queuesIds?: string[];
  includeNotQueueDefined?: string;
  tenantId: string | number;
  profile: string;
}

interface Response {
  tickets: any[];
  count: number;
  hasMore: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  status,
  date,
  showAll,
  userId,
  withUnreadMessages,
  queuesIds,
  isNotAssignedUser,
  includeNotQueueDefined,
  tenantId,
  profile
}: Request): Promise<Response> => {
  // check is admin
  const isAdminShowAll = showAll == "true" && profile === "admin";
  const isUnread =
    withUnreadMessages && withUnreadMessages == "true" ? "S" : "N";
  const isNotAssigned =
    isNotAssignedUser && isNotAssignedUser == "true" ? "S" : "N";
  const isShowAll = isAdminShowAll ? "S" : "N";
  const isQueuesIds = queuesIds ? "S" : "N";

  const isSearchParam = searchParam ? "S" : "N";

  if (!status && !isAdminShowAll) {
    // if not informed status and not admin, reject request
    // status = ["open", "pending"];
    throw new AppError("ERR_NO_STATUS_SELECTED", 404);
  }

  if (isAdminShowAll) {
    status = ["open", "pending", "closed"];
  }

  // Verificar se existem filas cadastradas, caso contrário,
  // não aplicar restrição
  const isExistsQueueTenant =
    (await Queue.count({
      where: { tenantId }
    })) > 0
      ? "S"
      : "N";
  // list queues user request
  const queues = await UsersQueues.findAll({
    where: {
      userId
    }
  });

  // mount array ids queues
  let queuesIdsUser = queues.map(q => q.queueId);
  // check is queues filter and verify access user queue
  if (queuesIds) {
    const newArray: number[] = [];
    queuesIds.forEach(i => {
      const idx = queuesIdsUser.indexOf(+i);
      if (idx) {
        newArray.push(+i);
      }
    });
    queuesIdsUser = newArray.length ? newArray : [0];
  }
  // se não existir fila, ajustar para parse do sql
  if (!queuesIdsUser.length) {
    queuesIdsUser = [0];
  }

  const query = `
  select
    count(*) OVER ( ) as count,
    c."profilePicUrl",
    c."name",
    u."name" as username,
    q.queue,
    jsonb_build_object('id', w.id, 'name', w."name") whatsapp,
    t.*,
    (
      SELECT jsonb_agg(jsonb_build_object('id', tag.id, 'name', tag.tag, 'color', tag.color))
      FROM "Tags" tag
      INNER JOIN ticket_tags tt ON tt."tag_id" = tag.id
      WHERE tt."ticket_id" = t.id
    ) as tags
  from "Tickets" t
  inner join "Whatsapps" w on (w.id = t."whatsappId")
  left join "Contacts" c on (t."contactId" = c.id)
  left join "Users" u on (u.id = t."userId")
  left join "Queues" q on (t."queueId" = q.id)
  where t."tenantId" = :tenantId
    and c."tenantId" = :tenantId
    and t.status in ( :status )
    and (( :isShowAll = 'N' and  (
      (:isExistsQueueTenant = 'S' and t."queueId" in ( :queuesIdsUser ))
      or t."userId" = :userId or exists (select 1 from "ContactWallets" cw where cw."walletId" = :userId and cw."contactId" = t."contactId") )
    ) OR (:isShowAll = 'S') OR (t."isGroup" = true) OR (:isExistsQueueTenant = 'N') )
    and (( :isUnread = 'S'  and t."unreadMessages" > 0) OR (:isUnread = 'N'))
    and ((:isNotAssigned = 'S' and t."userId" is null) OR (:isNotAssigned = 'N'))
    and ((:isSearchParam = 'S' and ( 
      (t.id::varchar like :searchParam) or 
      (exists (select 1 from "Contacts" c where c.id = t."contactId" and (upper(c."name") like upper(:searchParam) or c."number" like :searchParam)))
    )) OR (:isSearchParam = 'N'))
  order by t."updatedAt" desc
  limit :limit offset :offset 
  `;

  const limit = 30;
  const offset = limit * (+pageNumber - 1);

  const tickets: any = await Ticket.sequelize?.query(query, {
    replacements: {
      tenantId,
      isQueuesIds,
      status,
      isShowAll,
      isExistsQueueTenant,
      queuesIdsUser,
      userId,
      isUnread,
      isNotAssigned,
      isSearchParam,
      searchParam: `%${searchParam}%`,
      limit,
      offset
    },
    type: QueryTypes.SELECT,
    nest: true
  });

  let count = 0;
  let ticketsLength = 0;
  if (tickets?.length) {
    count = tickets[0].count;
    ticketsLength = tickets.length;
  }
  const hasMore = count > offset + ticketsLength;

  return {
    tickets: tickets || [],
    count,
    hasMore
  };
};

export default ListTicketsService;
