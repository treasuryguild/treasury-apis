// utils/dataProcessor.js
import supabase from '../lib/supabaseClient';

export async function processAndInsertData(rawData) {
  try {
    // Process the data
    const processedData = await processData(rawData);

    // Insert both raw and processed data into Supabase
    const { data: insertedData, error } = await supabase
      .from('tx_json_generator_data')
      .insert({
        raw_data: rawData,
        processed_data: processedData,
        reward_status: false
      })
      .select();

    if (error) throw error;

    return {
      insertedData: insertedData[0],
      rawData,
      processedData
    };
  } catch (error) {
    console.error('Error processing and inserting data:', error);
    throw error;
  }
}

async function processData(rawData) {
  // Replace this with your actual processing logic
  return {
    ...rawData,
    processed: true,
    processingTimestamp: new Date().toISOString()
  };
}