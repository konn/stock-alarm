export function alert() {
  const email = PropertiesService.getScriptProperties().getProperty("EMAIL");
  if (!email) {
    console.error("No EMAIL script property set!");
    return 1;
  }
  const spread_sheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spread_sheet.getActiveSheet();
  const sheet_url = spread_sheet.getUrl();
  const base_date = new Date();
  const middle_limit = new Date(
    base_date.getFullYear(),
    base_date.getMonth() + 4,
    1
  );
  const dead_stocks: Stock[] = [];
  const soon_expired: Stock[] = [];
  let living_stocks: number = 0;

  for (const row of sheet.getDataRange().getValues().slice(1)) {
    console.log(`Row: ${JSON.stringify(row)}`);
    const [date_str, amount, name] = row;
    const good_thru = new Date(date_str);
    const good: boolean = good_thru >= base_date;
    if (good) {
      living_stocks += amount;
      if (good_thru <= middle_limit) {
        soon_expired.push({ name, amount, good_thru });
      }
    } else {
      dead_stocks.push({ name, amount, good_thru });
    }
  }

  const survival_days = Math.floor(living_stocks / 3);

  console.log(`Living stocks: ${living_stocks}`);
  console.log(`Survivable days: ${survival_days}`);
  console.log(`Dead stocks: ${JSON.stringify(dead_stocks)}`);
  console.log(`Soon expired: ${JSON.stringify(soon_expired)}`);

  const to_send: boolean =
    survival_days < 7 || dead_stocks.length > 0 || soon_expired.length > 0;

  const alerts: Block[] = [];
  if (survival_days < 7) {
    const msg: string =
      survival_days < 3
        ? "❗️非常食の残りが三日と保ちません"
        : "⚠️非常食の残りが一週間分を切りました";
    alerts.push({ heading: [msg], level: 2 });
    alerts.push({
      paragraph: [`残り ${survival_days} 日（${living_stocks}食）`],
    });
  }

  if (dead_stocks.length > 0) {
    alerts.push({ heading: ["⚠️期限切れの非常食があります"], level: 2 });
    alerts.push(make_stock_list(dead_stocks, base_date));
  }

  if (soon_expired.length > 0) {
    alerts.push({
      heading: ["⚠️期限が近づいている非常食があります"],
      level: 2,
    });
    alerts.push(make_stock_list(soon_expired, base_date));
  }

  if (alerts.length > 0) {
    alerts.unshift({ heading: ["非常食在庫通知 - ", base_date], level: 1 });
    alerts.push(
      { heading: ["シートのリンク"], level: 2 },
      { paragraph: [{ body: ["シートへのリンク"], href: sheet_url }] }
    );
    const htmlBody = wrap_html(to_html(alerts));
    const body = to_markdown(alerts);
    const mail: GoogleAppsScript.Mail.MailAdvancedParameters = {
      name: "Stock Alert",
      subject: `⚠️非常食ストック通知 (${format_date(base_date)})`,
      to: email,
      htmlBody,
      body,
    };
    MailApp.sendEmail(mail);
  } else {
    console.log("No alert needed");
  }
}

declare type Stock = {
  name: string;
  amount: number;
  good_thru: Date;
};

declare type Inline =
  | string
  | Date
  | { bold: string }
  | { italic: string }
  | { body: Inline[]; href: string };

declare type Block =
  | { ul: Inline[][] }
  | { heading: Inline[]; level: number }
  | { paragraph: Inline[] };

function format_date(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inline_to_markdown(i: Inline): string {
  if (typeof i === "string") {
    return i;
  } else if (i instanceof Date) {
    return format_date(i);
  } else if ("bold" in i) {
    return `**${i.bold}**`;
  } else if ("italic" in i) {
    return `*${i.italic}*`;
  } else {
    const body = i.body.map((i) => inline_to_markdown(i)).join("");
    return `[${body}](${i.href})`;
  }
}
function inline_to_html(i: Inline): string {
  if (typeof i === "string") {
    return i;
  } else if (i instanceof Date) {
    return format_date(i);
  } else if ("bold" in i) {
    return `<b>${i.bold}</b>`;
  } else if ("italic" in i) {
    return `<em>${i.italic}</em>`;
  } else {
    const body = i.body.map((i) => inline_to_html(i)).join("");
    return `<a href="${i.href}">${body}</a>`;
  }
}

function inlines_to_markdown(inlines: Inline[]): string {
  return inlines.map((i) => inline_to_markdown(i)).join("");
}

function inlines_to_html(inlines: Inline[]): string {
  return inlines.map((i) => inline_to_html(i)).join("");
}

function to_markdown(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if ("ul" in block) {
        return block.ul.map((item) => `- ${item}`).join("\n");
      } else if ("heading" in block) {
        const head = "#".repeat(block.level);
        return `${head} ${block.heading}`;
      } else if ("paragraph" in block) {
        return block.paragraph.map((i) => inline_to_markdown(i)).join("");
      }
    })
    .join("\n\n");
}

function to_html(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if ("ul" in block) {
        return `<ul>${block.ul
          .map((item) => `<li>${inlines_to_html(item)}</li>`)
          .join("")}</ul>`;
      } else if ("heading" in block) {
        return `<h${block.level}>${inlines_to_html(block.heading)}</h${
          block.level
        }>`;
      } else if ("paragraph" in block) {
        const para = block.paragraph.map((i) => inline_to_html(i)).join("");
        return `<p>${para}</p>`;
      }
    })
    .join("\n");
}

function wrap_html(body: string): string {
  return ["<html>", "<head>", "</head>", "<body>", body, "</body>"].join("\n");
}

function make_stock_list(stocks: Stock[], base_date: Date): Block {
  return {
    ul: stocks.map((stock) => {
      let left: string = "";
      if (stock.good_thru > base_date) {
        const days_left = Math.floor(
          (stock.good_thru.getTime() - base_date.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        left = `、残り ${days_left} 日`;
      }
      return [
        `${stock.name} （残${stock.amount}食、期限：`,
        stock.good_thru,
        left,
        `）`,
      ];
    }),
  };
}
