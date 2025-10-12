import { supabase } from './supabaseClient';

export interface RfidCard {
  card_id: number;
  rfid_code: string;
  status?: string;
  is_active?: boolean;
  last_seen_at?: string;
}

export interface AvailableRfidCard {
  card_id: number;
  rfid_code: string;
  status?: string;
}

export interface RfidAssignment {
  card_id: number;
  student_id: number;
  assigned_by?: number;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
}

/**
 * ดึงรายการบัตร RFID ที่ยังไม่ได้ผูกกับนักเรียน
 */
export async function getUnassignedRfidCards(): Promise<AvailableRfidCard[]> {
  try {
    // ก่อนอื่นดึง card_id ที่ถูก assign แล้ว
    const { data: assignedCards, error: assignedError } = await supabase
      .from('rfid_card_assignments')
      .select('card_id')
      .eq('is_active', true);

    if (assignedError) {
      console.error('Error fetching assigned cards:', assignedError);
      throw assignedError;
    }

    const assignedCardIds = assignedCards?.map(card => card.card_id) || [];

    // ดึงบัตร RFID ที่ไม่อยู่ในรายการที่ถูก assign
    let query = supabase
      .from('rfid_cards')
      .select(`
        card_id,
        rfid_code,
        status
      `)
      .eq('is_active', true);

    // ถ้ามี assigned cards ให้ filter ออก
    if (assignedCardIds.length > 0) {
      query = query.not('card_id', 'in', `(${assignedCardIds.join(',')})`);
    }

    const { data, error } = await query.order('card_id', { ascending: true });

    if (error) {
      console.error('Error fetching available RFID cards:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch available RFID cards:', error);
    throw error;
  }
}

/**
 * ดึงรายการบัตร RFID ที่ว่าง
 * (ฟังก์ชันนี้เหมือนกับ getUnassignedRfidCards แต่เก็บไว้เพื่อ backward compatibility)
 */
export async function getAvailableRfidCards(): Promise<AvailableRfidCard[]> {
  return getUnassignedRfidCards();
}

/**
 * ดึงรายการบัตร RFID ที่ว่างทั้งหมด
 */
export async function getAllAvailableRfidCards(): Promise<AvailableRfidCard[]> {
  try {
    const availableCards = await getUnassignedRfidCards();
    console.log(`Found ${availableCards.length} available RFID cards`);
    return availableCards;
  } catch (error) {
    console.error('Failed to fetch all available RFID cards:', error);
    throw error;
  }
}

/**
 * ตรวจสอบว่าบัตร RFID ยังว่างอยู่หรือไม่
 */
export async function isRfidCardAvailable(cardId: number | string): Promise<boolean> {
  try {
    // แปลง cardId เป็น number ถ้าเป็น string
    const numericCardId = typeof cardId === 'string' ? parseInt(cardId) : cardId;
    
    // ตรวจสอบว่าบัตรมีอยู่และ active
    const { data: card, error: cardError } = await supabase
      .from('rfid_cards')
      .select('card_id, is_active')
      .eq('card_id', numericCardId)
      .eq('is_active', true)
      .maybeSingle();

    if (cardError) {
      console.error('Error checking RFID card:', cardError);
      return false;
    }

    if (!card) {
      return false; // บัตรไม่มีหรือไม่ active
    }

    // ตรวจสอบว่าบัตรยังไม่ได้ผูกกับนักเรียน
    const { data: assignment, error: assignmentError } = await supabase
      .from('rfid_card_assignments')
      .select('card_id')
      .eq('card_id', numericCardId)
      .eq('is_active', true)
      .maybeSingle();

    if (assignmentError) {
      console.error('Error checking RFID card assignment:', assignmentError);
      return false;
    }

    return !assignment; // ถ้าไม่มีการผูกแสดงว่าว่าง
  } catch (error) {
    console.error('Failed to check RFID card availability:', error);
    return false;
  }
}

/**
 * ดึงข้อมูลบัตร RFID ตาม card_id
 */
export async function getRfidCardById(cardId: number): Promise<RfidCard | null> {
  try {
    const { data, error } = await supabase
      .from('rfid_cards')
      .select('card_id, rfid_code, status, is_active, last_seen_at')
      .eq('card_id', cardId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching RFID card:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch RFID card:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลบัตร RFID ตาม rfid_code
 */
export async function getRfidCardByCode(rfidCode: string): Promise<RfidCard | null> {
  try {
    const { data, error } = await supabase
      .from('rfid_cards')
      .select('card_id, rfid_code, status, is_active, last_seen_at')
      .eq('rfid_code', rfidCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching RFID card by code:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch RFID card by code:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลการ assign RFID ของนักเรียน
 */
export async function getStudentRfidAssignment(studentId: number): Promise<RfidAssignment | null> {
  try {
    const { data, error } = await supabase
      .from('rfid_card_assignments')
      .select('card_id, student_id, assigned_by, valid_from, valid_to, is_active')
      .eq('student_id', studentId)
      .is('valid_to', null)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching student RFID assignment:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch student RFID assignment:', error);
    throw error;
  }
}

/**
 * Assign RFID card ให้นักเรียนโดยใช้ SQL โดยตรง
 */
export async function assignRfidCard(studentId: number, cardId: number, assignedBy?: number): Promise<any> {
  try {
    console.log('assignRfidCard called with:', { studentId, cardId, assignedBy });
    
    // ตรวจสอบว่าบัตร RFID มีอยู่และสถานะ
    const { data: cardData, error: cardError } = await supabase
      .from('rfid_cards')
      .select('card_id, status')
      .eq('card_id', cardId)
      .single();

    if (cardError || !cardData) {
      throw new Error('RFID card not found');
    }

    // ตรวจสอบว่าบัตรถูกใช้งานอยู่หรือไม่
    const { data: existingAssignment, error: assignmentError } = await supabase
      .from('rfid_card_assignments')
      .select('card_id, student_id')
      .eq('card_id', cardId)
      .eq('is_active', true)
      .is('valid_to', null)
      .single();

    if (assignmentError && assignmentError.code !== 'PGRST116') {
      throw assignmentError;
    }

    if (existingAssignment) {
      throw new Error(`RFID card is already assigned to student ${existingAssignment.student_id}`);
    }

    // ตรวจสอบว่านักเรียนมีบัตร RFID อยู่แล้วหรือไม่
    const { data: studentAssignment, error: studentError } = await supabase
      .from('rfid_card_assignments')
      .select('card_id')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .is('valid_to', null)
      .single();

    if (studentError && studentError.code !== 'PGRST116') {
      throw studentError;
    }

    const currentTime = new Date().toISOString();

    // ถ้านักเรียนมีบัตรอยู่แล้ว ให้ยกเลิกการ assign บัตรเก่าก่อน
    // ใช้วิธีการที่ปลอดภัยกับ unique constraint
    if (studentAssignment) {
      console.log('Deactivating old card assignment for student:', studentId);
      
      // ขั้นตอนที่ 1: ตั้งค่า is_active = false ก่อน (เพื่อหลีกเลี่ยง constraint conflict)
      const { error: deactivateError } = await supabase
        .from('rfid_card_assignments')
        .update({ 
          is_active: false,
          valid_to: currentTime 
        })
        .eq('student_id', studentId)
        .eq('is_active', true)
        .is('valid_to', null);

      if (deactivateError) {
        console.error('Error deactivating old assignment:', deactivateError);
        throw deactivateError;
      }

      // อัปเดตสถานะบัตรเก่าเป็น available
      const { error: oldCardError } = await supabase
        .from('rfid_cards')
        .update({ status: 'available' })
        .eq('card_id', studentAssignment.card_id);

      if (oldCardError) {
        console.error('Error updating old card status:', oldCardError);
        // ไม่ throw error เพราะไม่ critical
      }
    }

    // สร้าง assignment ใหม่
    const insertData: any = {
      card_id: cardId,
      student_id: studentId,
      valid_from: currentTime,
      is_active: true
    };

    // เพิ่ม assigned_by เฉพาะเมื่อมีค่า
    if (assignedBy !== undefined && assignedBy !== null) {
      insertData.assigned_by = assignedBy;
    }

    console.log('Inserting new assignment data:', insertData);

    const { error: insertError } = await supabase
      .from('rfid_card_assignments')
      .insert(insertData);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // อัปเดตสถานะบัตรใหม่เป็น assigned
    const { error: updateError } = await supabase
      .from('rfid_cards')
      .update({ status: 'assigned' })
      .eq('card_id', cardId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('RFID assignment completed successfully');

    return {
      success: true,
      message: 'RFID card assigned successfully',
      card_id: cardId,
      student_id: studentId,
      assigned_by: assignedBy,
      assigned_at: currentTime
    };

  } catch (error) {
    console.error('Failed to assign RFID card:', error);
    throw error;
  }
}

/**
 * Assign RFID card ให้นักเรียนโดยใช้ UID และ SQL โดยตรง
 */
export async function assignRfidByUid(studentId: number, cardUid: string, assignedBy?: number): Promise<any> {
  try {
    // ค้นหาบัตร RFID จาก UID
    const { data: cardData, error: cardError } = await supabase
      .from('rfid_cards')
      .select('card_id, status')
      .eq('rfid_code', cardUid)
      .single();

    if (cardError || !cardData) {
      throw new Error(`RFID card with UID ${cardUid} not found`);
    }

    // ใช้ฟังก์ชัน assignRfidCard ที่แก้ไขแล้ว
    return await assignRfidCard(studentId, cardData.card_id, assignedBy);

  } catch (error) {
    console.error('Failed to assign RFID card by UID:', error);
    throw error;
  }
}

/**
 * ยกเลิกการ assign RFID card โดยใช้ SQL โดยตรง
 */
export async function unassignRfidCard(studentId?: number, cardId?: number): Promise<any> {
  try {
    if (!studentId && !cardId) {
      throw new Error('Either studentId or cardId must be provided');
    }

    let query = supabase
      .from('rfid_card_assignments')
      .select('card_id, student_id')
      .is('valid_to', null);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (cardId) {
      query = query.eq('card_id', cardId);
    }

    const { data: assignments, error: selectError } = await query;

    if (selectError) {
      throw selectError;
    }

    if (!assignments || assignments.length === 0) {
      throw new Error('No active RFID assignment found');
    }

    // ยกเลิกการ assign โดยการตั้งค่า valid_to
    const currentTime = new Date().toISOString();
    
    let updateQuery = supabase
      .from('rfid_card_assignments')
      .update({ valid_to: currentTime })
      .is('valid_to', null);

    if (studentId) {
      updateQuery = updateQuery.eq('student_id', studentId);
    }
    if (cardId) {
      updateQuery = updateQuery.eq('card_id', cardId);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      throw updateError;
    }

    // อัปเดตสถานะบัตรเป็น available
    for (const assignment of assignments) {
      await supabase
        .from('rfid_cards')
        .update({ status: 'available' })
        .eq('card_id', assignment.card_id);
    }

    return {
      success: true,
      message: 'RFID card unassigned successfully',
      unassigned_assignments: assignments,
      unassigned_at: currentTime
    };

  } catch (error) {
    console.error('Failed to unassign RFID card:', error);
    throw error;
  }
}