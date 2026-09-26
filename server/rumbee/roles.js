// RumBee ID owns each user's role on the "url" product; Kutt's `role` column
// is a copy. id.'s role_key vocabulary (GET /api/v1/roles) is lowercase —
// "Admin" is only the display label and id. rejects it with a 422.

const { ROLES } = require("../consts");

const ROLE_KEYS = { [ROLES.ADMIN]: "admin", [ROLES.USER]: "user" };

function toRumbeeRole(kuttRole) {
  return ROLE_KEYS[kuttRole] ?? ROLE_KEYS[ROLES.USER];
}

function fromRumbeeRole(roleKey) {
  return Object.keys(ROLE_KEYS).find(role => ROLE_KEYS[role] === roleKey) ?? null;
}

// Applies the role carried by id.'s access token to the local user. An
// unknown key leaves the local role alone rather than guessing.
function createRoleSync({ updateUser }) {
  return async function syncRole(user, roleKey) {
    const role = fromRumbeeRole(roleKey);
    if (!role || role === user.role) return user;
    const updated = await updateUser({ id: user.id }, { role });
    return { ...user, ...updated };
  };
}

module.exports = { toRumbeeRole, createRoleSync };
