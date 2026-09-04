export type Role = 'owner'|'admin'|'editor'|'approver'|'viewer';

const permissions: Record<Role, string[]> = {
  owner: ['*'],
  admin: ['read','write','approve','publish','manage_connections'],
  editor: ['read','write'],
  approver: ['read','approve'],
  viewer: ['read']
};

export function hasPermission(role: Role, action: string) {
  const perms = permissions[role] || [];
  return perms.includes('*') || perms.includes(action);
}
