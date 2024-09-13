import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ticket_tags", {
      ticket_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: "Tickets", // Nome da tabela referenciada
          key: "id"
        },
        onDelete: "CASCADE"
      },
      tag_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: "Tags", // Nome da tabela referenciada
          key: "id"
        },
        onDelete: "CASCADE"
      }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ticket_tags");
  }
};
