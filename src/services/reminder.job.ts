import { supabase } from '../database/supabase';
import { sendReminderEmail } from './email.service';

export const processDailyReminders = async () => {
  console.log('Processing daily reminders...');
  
  try {
    // 1. Get all parties with reminder_frequency > 0
    const { data: parties, error } = await supabase
      .from('parties')
      .select('*, udhar_transactions(*), profiles(full_name)')
      .gt('reminder_frequency', 0);

    if (error || !parties) {
      console.error('Error fetching parties for reminders:', error);
      return;
    }

    const now = new Date();

    for (const party of parties as any[]) {
      // Skip if no email or if start date is in the future
      if (!party.email) continue;
      
      if (party.reminder_start_date) {
        const startDate = new Date(party.reminder_start_date);
        if (startDate > now) {
          console.log(`Skipping reminder for ${party.name} - starts on ${startDate.toDateString()}`);
          continue;
        }
      }

      // Calculate balance
      let balance = 0;
      party.udhar_transactions.forEach((tx: any) => {
        if (tx.type === 'given') balance += Number(tx.amount);
        else balance -= Number(tx.amount);
      });

      // Skip if no outstanding balance
      if (balance <= 0) continue;

      // Check if we need to send another reminder today
      const lastSent = party.last_reminder_sent_at ? new Date(party.last_reminder_sent_at) : null;
      let sentToday = party.reminders_sent_today || 0;

      // Reset count if new day
      if (lastSent && lastSent.toDateString() !== now.toDateString()) {
        sentToday = 0;
        await supabase.from('parties').update({ reminders_sent_today: 0 }).eq('id', party.id);
      }

      let shouldSend = false;

      if (!lastSent || lastSent.toDateString() !== now.toDateString()) {
        shouldSend = true;
      } else if (sentToday < party.reminder_frequency) {
        // Gap check (4h)
        const hoursSinceLast = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLast >= 4) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        const senderName = party.profiles?.full_name || 'Daily-KHATA User';
        console.log(`Sending auto-reminder ${sentToday + 1} to ${party.name} (${party.email})`);
        
        try {
          await sendReminderEmail(party.email, party.name, balance, senderName);
          
          await supabase
            .from('parties')
            .update({ 
              last_reminder_sent_at: now.toISOString(),
              reminders_sent_today: sentToday + 1
            })
            .eq('id', party.id);
        } catch (e) {
          console.error(`Failed to send email to ${party.email}:`, e);
        }
      }
    }
  } catch (e) {
    console.error('Reminder process failed:', e);
  }
};

