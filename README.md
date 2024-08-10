# 非常食通知 (Food-stock alert) GAS

## Features

Notifies the status of your emergency food stock, maintained on Google Spreadsheet.
The message is in Japanese, but you can modify it as you like.
It sends a mail if at least one of the following criteria is met:

1. There is any stock with its good-thru date expired, 
2. There is any stock which expires the good-thru date within THREE months, or
3. The total stock cannot afford a week or three days.

## Usage

1. Install clasp locally
2. Create a GAS for a spreadsheet, with the first row as the header, the first column a due date, the second a number of foods, and the third a name.
3. Copy `.clasp.example.json` as `.clas.json` and set `scriptId` attribute accordingly.
4. Configure `EMAIL` script property to the address to send an email.
5. Set the trigger event appropriately.
6. `clamp push`
7. :+1:
