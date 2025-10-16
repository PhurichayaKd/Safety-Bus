// Type declarations for EmergencyService.js
export declare class EmergencyService {
  static getEmergencyLogs(limit?: number): Promise<any>;
  static createEmergencyEvent(eventData: any): Promise<any>;
  static updateEmergencyStatus(eventId: number, status: string, notes?: string): Promise<any>;
  static getEmergencyById(eventId: number): Promise<any>;
  static deleteEmergencyEvent(eventId: number): Promise<any>;
}

export default EmergencyService;