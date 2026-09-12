const absence = require('../handlers/absenceHandler');
const service = require('../handlers/serviceHandler');
const sanction = require('../handlers/sanctionHandler');
const avis = require('../handlers/avisHandler');
const annonce = require('../handlers/annonceHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        return await command.execute(interaction);
      }

      if (interaction.isButton()) {
        const id = interaction.customId;

        if (id === 'absence_declare') return absence.openDeclareModal(interaction);
        if (id.startsWith('absence_accept_')) {
          return absence.handleDecision(interaction, id.replace('absence_accept_', ''), true);
        }
        if (id.startsWith('absence_refuse_')) {
          return absence.handleDecision(interaction, id.replace('absence_refuse_', ''), false);
        }

        if (id === 'service_start') return service.handleStart(interaction);
        if (id === 'service_pause') return service.handlePause(interaction);
        if (id === 'service_stop') return service.handleStop(interaction);
        if (id === 'service_admin_forcestop') return service.handleAdminForceStopSelect(interaction);
        if (id === 'service_admin_add') return service.handleAdminAddSelect(interaction);
        if (id === 'service_admin_remove') return service.handleAdminRemoveSelect(interaction);
        if (id === 'service_admin_view') return service.handleAdminView(interaction);

        if (id === 'avis_open') return avis.openAvisModal(interaction);
        if (id === 'annonce_open') return annonce.openAnnonceModal(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const id = interaction.customId;
        if (id.startsWith('sanction_type_select_')) {
          const targetId = id.replace('sanction_type_select_', '');
          return sanction.handleTypeSelect(interaction, targetId);
        }
        return;
      }

      if (interaction.isUserSelectMenu()) {
        const id = interaction.customId;
        if (id === 'service_admin_forcestop_select') return service.handleAdminForceStopResolve(interaction);
        if (id === 'service_admin_add_select') return service.handleAdminAddResolve(interaction);
        if (id === 'service_admin_remove_select') return service.handleAdminRemoveResolve(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        const id = interaction.customId;
        if (id === 'absence_modal') return absence.handleModalSubmit(interaction);
        if (id === 'avis_modal') return avis.handleAvisSubmit(interaction);
        if (id === 'annonce_modal') return annonce.handleAnnonceSubmit(interaction);

        if (id.startsWith('sanction_reason_modal_')) {
          const rest = id.replace('sanction_reason_modal_', ''); // "<targetId>_<typeIndex>"
          const [targetId, typeIndex] = rest.split('_');
          return sanction.handleReasonSubmit(interaction, targetId, typeIndex);
        }
        if (id.startsWith('service_admin_add_modal_')) {
          const userId = id.replace('service_admin_add_modal_', '');
          return service.handleAdminAddModalSubmit(interaction, userId);
        }
        if (id.startsWith('service_admin_remove_modal_')) {
          const userId = id.replace('service_admin_remove_modal_', '');
          return service.handleAdminRemoveModalSubmit(interaction, userId);
        }
        return;
      }
    } catch (err) {
      console.error(err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true }).catch(() => {});
      }
    }
  }
};
