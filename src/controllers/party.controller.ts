import { Response } from 'express';
import { supabase } from '../database/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { sendReminderEmail } from '../services/email.service';

export const getParties = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { data, error } = await supabase
    .from('parties')
    .select('*, udhar_transactions(*)')
    .eq('user_id', userId);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ parties: data });
};

export const createParty = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { name, phone, email, reminder_frequency, reminder_start_date } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Party name is required' });
  }

  const { data, error } = await supabase
    .from('parties')
    .insert([{ 
      user_id: userId, 
      name, 
      phone, 
      email, 
      reminder_frequency: reminder_frequency || 0,
      reminder_start_date: reminder_start_date || null
    }])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ party: data });
};

export const updateParty = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { name, phone, email, reminder_frequency, reminder_start_date } = req.body;

  const { data, error } = await supabase
    .from('parties')
    .update({ 
      name, 
      phone, 
      email, 
      reminder_frequency,
      reminder_start_date
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ party: data });
};

export const deleteParty = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { id } = req.params;

  const { error } = await supabase
    .from('parties')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ message: 'Party deleted successfully' });
};

export const triggerManualReminder = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { partyId } = req.body;

  try {
    // 1. Get party and their current balance
    const { data: party, error: pError } = await supabase
      .from('parties')
      .select('*, udhar_transactions(*)')
      .eq('id', partyId)
      .eq('user_id', userId)
      .single();

    if (pError || !party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (!party.email) {
      return res.status(400).json({ error: 'Party email is missing' });
    }

    // Calculate balance
    let balance = 0;
    party.udhar_transactions.forEach((tx: any) => {
      if (tx.type === 'given') balance += Number(tx.amount);
      else balance -= Number(tx.amount);
    });

    if (balance <= 0) {
      return res.status(400).json({ error: 'No outstanding balance found' });
    }

    // Get user full name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const senderName = profile?.full_name || 'Daily-KHATA User';

    // 2. Send email
    await sendReminderEmail(party.email, party.name, balance, senderName);

    // 3. Update party last reminder sent
    await supabase
      .from('parties')
      .update({ 
        last_reminder_sent_at: new Date().toISOString(),
        reminders_sent_today: (party.reminders_sent_today || 0) + 1
      })
      .eq('id', partyId);

    return res.status(200).json({ message: 'Reminder email sent successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const addUdharTransaction = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { party_id, amount, type, note, transaction_date } = req.body;

  if (!party_id || !amount || !type) {
    return res.status(400).json({ error: 'Party ID, amount, and type are required' });
  }

  const { data, error } = await supabase
    .from('udhar_transactions')
    .insert([{
      party_id,
      user_id: userId,
      amount,
      type,
      note,
      transaction_date: transaction_date || new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ udhar_transaction: data });
};

