import { Response } from 'express';
import { supabase } from '../database/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { StorageService } from '../services/storage.service';

export const addTransaction = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { amount, category_id, type, note, transaction_date, party_id, party_name, udhar_type } = req.body;

    if (!amount || !type || !category_id) {
      return res.status(400).json({ error: 'Amount, type, and category_id are mathematically required.' });
    }

    // Upload Invoice if present
    let receipt_url = req.body.receipt_url;
    if (req.file) {
      try {
        receipt_url = await StorageService.uploadFile('invoices', String(userId), req.file);
      } catch (err) {
        console.error('Invoice upload failed:', err);
      }
    }

    // Validate Category and Type
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('type')
      .eq('id', category_id)
      .single();

    if (catError || !category) {
      return res.status(400).json({ error: 'Invalid category selected.' });
    }

    if (category.type !== type) {
      return res.status(400).json({ error: `Category type (${category.type}) does not match transaction type (${type}).` });
    }

    // Intelligent Udhar Node Resolution
    let resolvedPartyId = party_id;
    if (!resolvedPartyId && party_name) {
      const { data: newParty, error: pError } = await supabase
        .from('parties')
        .insert([{ user_id: userId, name: party_name }])
        .select()
        .single();
      if (!pError && newParty) {
        resolvedPartyId = newParty.id;
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        amount: Number(amount), // Ensure number
        category_id,
        party_id: resolvedPartyId || null,
        type,
        note,
        transaction_date: transaction_date || new Date().toISOString(),
        receipt_url
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Handle Udhar Transaction if needed
    if (udhar_type && resolvedPartyId) {
      await supabase.from('parties').update({
        reminders_sent_today: 0, // Reset for new debt
      }).eq('id', resolvedPartyId);
    }

    return res.status(201).json({ transaction: data });
  } catch (err: any) {
    console.error('Add Transaction Error:', err);
    return res.status(500).json({ error: err.message || 'Server side error' });
  }
};

export const getTransactions = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('transactions')
    .select('*, categories(*), parties(*)', { count: 'exact' })
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ 
    transactions: data,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
    currentPage: page
  });
};

export const getSummary = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type, category_id, transaction_date, categories(name, color, type)')
    .eq('user_id', userId);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  let totalIncome = 0;
  let totalExpense = 0;
  const categorySplit: Record<string, { name: string, color: string, total: number }> = {};

  if (data) {
    data.forEach((trx: any) => {
      const amt = Number(trx.amount);
      if (trx.type === 'income') {
        totalIncome += amt;
      } else if (trx.type === 'expense') {
        totalExpense += amt;
        const catName = trx.categories?.name || 'Uncategorized';
        const color = trx.categories?.color || '#cccccc';
        if (!categorySplit[catName]) {
          categorySplit[catName] = { name: catName, color, total: 0 };
        }
        categorySplit[catName].total += amt;
      }
    });
  }

  const totalSavings = totalIncome - totalExpense;

  return res.status(200).json({
    summary: {
      totalIncome,
      totalExpense,
      totalSavings,
      categorySplit: Object.values(categorySplit)
    }
  });
};

export const getTransactionById = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { id } = req.params;

  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(*), parties(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  return res.status(200).json({ transaction: data });
};

export const updateTransaction = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { amount, category_id, type, note, transaction_date, party_id, party_name } = req.body;

    if (!amount || !type || !category_id) {
      return res.status(400).json({ error: 'Amount, type, and category_id are mathematically required.' });
    }

    // Upload Invoice if present
    let receipt_url = req.body.receipt_url;
    if (req.file) {
      try {
        receipt_url = await StorageService.uploadFile('invoices', String(userId), req.file);
      } catch (err) {
        console.error('Invoice upload failed:', err);
      }
    }

    // Validate Category and Type
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('type')
      .eq('id', category_id)
      .single();

    if (catError || !category) {
      return res.status(400).json({ error: 'Invalid category selected.' });
    }

    if (category.type !== type) {
      return res.status(400).json({ error: `Category type (${category.type}) does not match transaction type (${type}).` });
    }

    // Intelligent Udhar Node Resolution
    let resolvedPartyId = party_id;
    if (!resolvedPartyId && party_name) {
      const { data: newParty, error: pError } = await supabase
        .from('parties')
        .insert([{ user_id: userId, name: party_name }])
        .select()
        .single();
      if (!pError && newParty) {
        resolvedPartyId = newParty.id;
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({
        amount: Number(amount),
        category_id,
        party_id: resolvedPartyId || null,
        type,
        note,
        transaction_date,
        receipt_url
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ transaction: data });
  } catch (err: any) {
    console.error('Update Transaction Error:', err);
    return res.status(500).json({ error: err.message || 'Server side error' });
  }
};

export const deleteTransaction = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { id } = req.params;

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ message: 'Transaction deleted successfully.' });
};
