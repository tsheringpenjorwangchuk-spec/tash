/**
 * MongoDB integration placeholder.
 *
 * Do not import this file yet. It documents the interface the database teammate can
 * implement once MongoDB is ready. The current app continues to use localStorage.
 *
 * Suggested packages later: mongodb OR mongoose, plus authentication middleware.
 */

export async function connectDatabase() {
  throw new Error("MongoDB not connected yet. Implement this adapter when the database is ready.");
}

export const repositories = {
  users: {
    async list() {},
    async findByEmail(_email) {},
    async create(_payload) {},
  },
  lostItems: {
    async list(_filters = {}) {},
    async create(_payload) {},
    async update(_id, _payload) {},
    async remove(_id) {},
  },
  foundItems: {
    async list(_filters = {}) {},
    async create(_payload) {},
    async update(_id, _payload) {},
  },
  claims: {
    async list(_filters = {}) {},
    async create(_payload) {},
    async review(_id, _payload) {},
    async confirmCollection(_id, _collectionCode) {},
  },
};
 