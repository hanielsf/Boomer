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
  SELECT
    count(*) OVER ( ) as count,
    c."profilePicUrl",
    c."name" as contact_name,
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
  FROM "Tickets" t
  INNER JOIN "Whatsapps" w ON (w.id = t."whatsappId")
  LEFT JOIN "Contacts" c ON (t."contactId" = c.id)
  LEFT JOIN "Users" u ON (u.id = t."userId")
  LEFT JOIN "Queues" q ON (t."queueId" = q.id)
  WHERE t."tenantId" = :tenantId
    AND c."tenantId" = :tenantId
    AND t.status IN ( :status )
    AND (( :isShowAll = 'N' AND  (
      (:isExistsQueueTenant = 'S' AND t."queueId" IN ( :queuesIdsUser ))
      OR t."userId" = :userId OR EXISTS (SELECT 1 FROM "ContactWallets" cw WHERE cw."walletId" = :userId AND cw."contactId" = t."contactId") )
    ) OR (:isShowAll = 'S') OR (t."isGroup" = true) OR (:isExistsQueueTenant = 'N') )
    AND (( :isUnread = 'S'  AND t."unreadMessages" > 0) OR (:isUnread = 'N'))
    AND ((:isNotAssigned = 'S' AND t."userId" IS NULL) OR (:isNotAssigned = 'N'))
    AND ((:isSearchParam = 'S' AND ( 
      (t.id::varchar LIKE :searchParam) OR 
      (EXISTS (SELECT 1 FROM "Contacts" c WHERE c.id = t."contactId" AND (UPPER(c."name") LIKE UPPER(:searchParam) OR c."number" LIKE :searchParam)))
    )) OR (:isSearchParam = 'N'))
  ORDER BY t."updatedAt" DESC
  LIMIT :limit OFFSET :offset 
  `;

  const limit = 3000;
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
