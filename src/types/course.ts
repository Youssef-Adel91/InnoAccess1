/**
 * Course Type Enum
 * Separated from Course model to allow safe imports in client components
 */
export enum CourseType {
    RECORDED = 'RECORDED',
    LIVE = 'LIVE',
}

/**
 * Live Session Interface
 */
export interface ILiveSession {
    startDate: Date;
    durationMinutes: number;
    zoomMeetingLink: string;
    zoomRecordingLink?: string;
    instructions?: string;
    isRecordingAvailable: boolean;
}
