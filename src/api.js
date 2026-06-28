export const API_URL = 'https://script.google.com/macros/s/AKfycbzrNN2KnhHnBZ7QAwdzqx2aVIEssvYQZln4jeozLObqRL-eovsvHRmVqAG7za53P3If/exec';

export async function fetchData() {
  const res = await fetch(`${API_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data');
  return res.json();
}

export async function submitLineup(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Submission failed');
  return res.json();
}
