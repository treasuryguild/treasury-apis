// utils/ExcelDataFetcher.ts
import axios from 'axios';

const ExcelDataFetcher = {
  async fetchExcelData() {
    try {
      const response = await axios.get('/api/read-excel');
      console.log(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
};

export default ExcelDataFetcher;