const { ownerId, adminRoleIds } = require('../config/environment');
const { PermissionsBitField } = require('discord.js');

function isAdmin(interaction) {
  if (!interaction?.user?.id) return false;

  // 1) 環境変数/設定で指定されたオーナーID
  if (ownerId && interaction.user.id === ownerId) {
    return true;
  }

  if (!interaction.guildId) {
    return false;
  }

  // 2) サーバー所有者
  if (interaction.guild?.ownerId === interaction.user.id) {
    return true;
  }
  // 3) Administrator 権限保持
  if (interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }

  const roleIds = (adminRoleIds ?? []).map(id => id.trim()).filter(Boolean);
  if (roleIds.length === 0) return false;

  const memberFromInteraction = interaction.member;
  if (memberFromInteraction?.roles?.cache) {
    return roleIds.some(roleId => memberFromInteraction.roles.cache.has(roleId));
  }

  if (Array.isArray(memberFromInteraction?.roles)) {
    return roleIds.some(roleId => memberFromInteraction.roles.includes(roleId));
  }

  const cachedMember = interaction.guild?.members?.cache?.get(interaction.user.id);
  if (cachedMember?.roles?.cache) {
    return roleIds.some(roleId => cachedMember.roles.cache.has(roleId));
  }

  return false;
}

module.exports = { isAdmin };