// controllers/meetingController.js
export const processMeetingsData = (meetingsWithParticipantsData) => {
  return meetingsWithParticipantsData.map(({ participants, meetingData }) => ({
    id: meetingData.id,
    uuid: meetingData.uuid,
    topic: meetingData.topic,
    scheduled_start: meetingData.start_time,
    actual_start: getEarliestJoinTime(participants)?.toISOString() || meetingData.start_time || null,
    duration: meetingData.duration,
    total_participants: participants?.length || 0,
    participants: participants?.map(p => ({
      ...p,
      join_time: p.join_time ? new Date(p.join_time).toISOString() : null,
      leave_time: p.leave_time ? new Date(p.leave_time).toISOString() : null
    })) || []
  }));
};