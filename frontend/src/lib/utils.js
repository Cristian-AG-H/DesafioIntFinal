// src/lib/utils.js
export const sanitizeJson = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return null; // o 0, dependiendo de tu preferencia
      if (!Number.isFinite(value)) return null; // Infinity, -Infinity
    }
    return value;
  }));
};