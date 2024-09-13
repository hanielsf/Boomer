module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.addColumn('ticket_tags', 'createdAt', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      });
      await queryInterface.addColumn('ticket_tags', 'updatedAt', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      });
    },
  
    down: async (queryInterface, Sequelize) => {
      await queryInterface.removeColumn('ticket_tags', 'createdAt');
      await queryInterface.removeColumn('ticket_tags', 'updatedAt');
    }
  };
  