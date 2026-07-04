// Reusable notification engine for third-party integrations (Slack, MS Teams, WhatsApp)

async function sendWebhookNotification(event, data) {
  try {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    const teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL;
    const whatsappApiKey = process.env.WHATSAPP_API_KEY;

    let message = '';
    if (event === 'leave_apply') {
      message = `📢 *New Leave Applied*\n• *Employee:* ${data.employeeName}\n• *Type:* ${data.leaveType}\n• *Duration:* ${data.startDate} to ${data.endDate}\n• *Reason:* ${data.reason}`;
    } else if (event === 'leave_approved') {
      message = `✅ *Leave Approved*\n• *Employee:* ${data.employeeName}\n• *Type:* ${data.leaveType}\n• *Duration:* ${data.startDate} to ${data.endDate}\n• *Approved By:* ${data.approverName}`;
    } else if (event === 'leave_rejected') {
      message = `❌ *Leave Rejected*\n• *Employee:* ${data.employeeName}\n• *Type:* ${data.leaveType}\n• *Duration:* ${data.startDate} to ${data.endDate}\n• *Rejected By:* ${data.approverName}`;
    }

    console.log(`[Notification Engine] Triggering alerts for event: ${event}`);
    console.log(`[Notification Engine] Log Message Payload: \n${message}`);

    // Trigger Slack Webhook if configured
    if (slackWebhookUrl) {
      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message })
      }).catch(err => console.error('[Slack Notification Error]', err.message));
    }

    // Trigger Teams Webhook if configured
    if (teamsWebhookUrl) {
      await fetch(teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          "themeColor": "0076D7",
          "summary": event.replace(/_/g, ' '),
          "sections": [{
            "activityTitle": event === 'leave_apply' ? "New Leave Request" : "Leave Status Update",
            "text": message.replace(/\*/g, '**') // Convert Slack bold (*) to Markdown (**)
          }]
        })
      }).catch(err => console.error('[Teams Notification Error]', err.message));
    }

    // Trigger WhatsApp Simulation/API
    if (whatsappApiKey) {
      console.log(`[WhatsApp API] Sending WhatsApp alert using key (${whatsappApiKey.substring(0,4)}***)`);
    }

    return true;
  } catch (error) {
    console.error('[Notification Engine Failure]', error.message);
    return false;
  }
}

module.exports = { sendWebhookNotification };
