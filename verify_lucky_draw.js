
// Removed require('node-fetch'); assuming Node 18+ environment with native fetch

async function verify() {
    const baseUrl = 'http://localhost:3000/api/lucky-draw';
    const userId = '6745d926-84c9-43db-9245-d72f2889df41';

    console.log('--- Verifying action=events ---');
    try {
        const res = await fetch(`${baseUrl}?action=events`);
        if (res.status === 200) {
            const data = await res.json();
            console.log('SUCCESS: action=events OK');
            console.log('Events count:', data.events?.length);
            if (data.events?.length > 0) {
                console.log('First event:', data.events[0]);
            }
        } else {
            const text = await res.text();
            console.error('FAILED: action=events Status:', res.status);
            console.error('Error Body:', text);
        }
    } catch (err) {
        console.error('Error fetching events:', err);
    }

    console.log('\n--- Verifying action=all ---');
    try {
        const res = await fetch(`${baseUrl}?action=all&userId=${userId}`);
        if (res.status === 200) {
            const data = await res.json();
            console.log('SUCCESS: action=all OK');
            console.log('Events count:', data.events?.length);
            console.log('Entries count:', data.entries?.length);
            if (data.events?.length > 0) {
                console.log('First event (from all):', data.events[0]);
            }
        } else {
            console.error('FAILED: action=all Status:', res.status);
        }
    } catch (err) {
        console.error('Error fetching all:', err);
    }
}

verify();
