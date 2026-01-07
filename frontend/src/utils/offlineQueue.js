// Offline queue management for incident submissions

const QUEUE_KEY = 'sahayata_offline_queue';

export function addToOfflineQueue(incident) {
  const queue = getOfflineQueue();
  queue.push({
    ...incident,
    queued_at: new Date().toISOString(),
    synced: false,
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue.length;
}

export function getOfflineQueue() {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function removeFromQueue(index) {
  const queue = getOfflineQueue();
  queue.splice(index, 1);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function markAsSynced(index) {
  const queue = getOfflineQueue();
  if (queue[index]) {
    queue[index].synced = true;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export function clearSyncedItems() {
  const queue = getOfflineQueue();
  const unsynced = queue.filter(item => !item.synced);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(unsynced));
}

export function isOnline() {
  return navigator.onLine;
}

export async function syncQueue(apiBase, token) {
  if (!isOnline()) {
    return { synced: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  const unsynced = queue.filter(item => !item.synced);
  
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < unsynced.length; i++) {
    try {
      const response = await fetch(`${apiBase}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(unsynced[i]),
      });

      if (response.ok) {
        markAsSynced(queue.indexOf(unsynced[i]));
        synced++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error('Error syncing item:', err);
      failed++;
    }
  }

  clearSyncedItems();
  return { synced, failed };
}