const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('fast-csv');

const app = express();
const port = 3001;
const csvFilePath = 'data.csv';

app.use(cors());
app.use(express.json());

app.post('/data', (req, res) => {
  const newRowData = req.body;

  let rows = [];
  const headers = ['ID', 'Timestamp', 'Button Name', 'Pitch', 'Roll', 'Heading', 'Latitude', 'Longitude', 'Remarks'];
  const customHeaders = newRowData.customData ? Object.keys(newRowData.customData) : [];
  const allHeaders = headers.concat(customHeaders);

  if (fs.existsSync(csvFilePath)) {
    fs.createReadStream(csvFilePath)
      .pipe(csv.parse({ headers: true }))
      .on('error', (error) => console.error(error))
      .on('data', (row) => rows.push(row))
      .on('end', () => {
        processData(rows);
      });
  } else {
    processData([]);
  }

  function processData(existingRows) {
    const flattenedRow = {
      ID: newRowData.id,
      Timestamp: newRowData.timestamp,
      'Button Name': newRowData.buttonName,
      Pitch: newRowData.pitch,
      Roll: newRowData.roll,
      Heading: newRowData.heading,
      Latitude: newRowData.lat,
      Longitude: newRowData.lon,
      Remarks: newRowData.remarks,
      ...newRowData.customData,
    };

    const rowIndex = existingRows.findIndex((row) => row.ID == newRowData.id);

    if (rowIndex !== -1) {
      existingRows[rowIndex] = flattenedRow;
    } else {
      existingRows.push(flattenedRow);
    }
    
    // Get all headers from all rows
    const allHeadersFromAllRows = new Set(allHeaders);
    existingRows.forEach(row => {
      Object.keys(row).forEach(header => {
        allHeadersFromAllRows.add(header);
      });
    });
    
    const finalHeaders = Array.from(allHeadersFromAllRows);

    const ws = fs.createWriteStream(csvFilePath);
    csv
      .write(existingRows, { headers: finalHeaders })
      .pipe(ws)
      .on('finish', () => {
        res.status(200).send('Data saved successfully');
      });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});