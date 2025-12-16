import { storage } from '../utils/storage';
import { buildApiUrl, buildApiUrlWithParams, API_ENDPOINTS } from '../config/api';

/**
 * Fetch technician availability (Public endpoint - no auth required)
 * @param {number} technicianId - Technician's user ID
 * @returns {Promise<object>}
 */
export const getTechnicianAvailability = async (technicianId: number): Promise<any> => {
  try {
    const url = buildApiUrlWithParams(API_ENDPOINTS.TECHNICIAN_AVAILABILITY, { id: technicianId });
    
    console.log('📤 [BookingService] Fetching technician availability...');
    console.log('   Technician ID:', technicianId);
    console.log('   URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const status = response.status;
    console.log('📥 [BookingService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BookingService] Error response:', errorText);
      throw new Error(`Failed to fetch availability: ${status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ [BookingService] Availability loaded');
    console.log('   Status:', data.status);
    console.log('   Slots:', data.availability?.length || 0);
    
    return data;
    
  } catch (error: any) {
    console.error('❌ [BookingService] Error fetching availability:', error);
    throw error;
  }
};

/**
 * Create booking/appointment request
 * @param {object} bookingData - Booking details
 * @returns {Promise<object>}
 */
export const createAppointment = async (bookingData: {
  technicianId: number;
  projectId?: number;
  requestedDate: string; // YYYY-MM-DD
  requestedStartTime: string; // HH:mm:ss
  requestedEndTime: string; // HH:mm:ss
  address: string;
}): Promise<any> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.CREATE);
    
    console.log('📤 [BookingService] Creating appointment...');
    console.log('   URL:', url);
    console.log('   Data:', JSON.stringify(bookingData, null, 2));
    
    // Format times to HH:mm:ss
    const formatTime = (time: string): string => {
      if (time.includes(':')) {
        const parts = time.split(':');
        if (parts.length === 2) {
          return `${time}:00`;
        }
      }
      return time;
    };
    
    const requestBody: any = {
      technicianId: bookingData.technicianId,
      requestedDate: bookingData.requestedDate, // YYYY-MM-DD
      requestedStartTime: formatTime(bookingData.requestedStartTime), // HH:mm:ss
      requestedEndTime: formatTime(bookingData.requestedEndTime), // HH:mm:ss
      address: bookingData.address
    };
    
    // Add projectId if provided
    if (bookingData.projectId) {
      requestBody.projectId = parseInt(String(bookingData.projectId));
    }
    
    console.log('📤 [BookingService] Request Body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const status = response.status;
    console.log('📥 [BookingService] Response Status:', status);
    
    const data = await response.json();
    console.log('📥 [BookingService] Response:', data);
    
    if (status === 200 || status === 201) {
      console.log('✅ [BookingService] Appointment created successfully');
      console.log('   Request ID:', data.id);
      console.log('   Status:', data.status);
      
      return {
        success: true,
        appointment: data
      };
    } else {
      throw new Error(data.message || 'Failed to create appointment');
    }
    
  } catch (error: any) {
    console.error('❌ [BookingService] Error creating appointment:', error);
    throw error;
  }
};

