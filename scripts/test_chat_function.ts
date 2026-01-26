const { data, error } = await supabase.functions.invoke('chat-support', {
    body: {
        messages: [{ role: 'user', content: 'ping' }]
    }
});

console.log('Data:', data);
console.log('Error:', error);
if (error && error.context) {
    const details = await error.context.json();
    console.log('Error Details:', details);
}
