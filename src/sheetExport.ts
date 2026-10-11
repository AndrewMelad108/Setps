import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { GlobalTask, WorkSession, WorkSheet, workByTaskForSheet, workSheetSummary } from "./model";

const safeFileName = (title: string) => title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 48) || "sheet";
const htmlEscape = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;")
  .replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

function reportRows(sheet: WorkSheet, tasks: GlobalTask[], sessions: WorkSession[]) {
  const taskById = new Map(tasks.map(task => [task.id, task]));
  return workByTaskForSheet(sheet, sessions).map(item => ({
      task: taskById.get(item.taskId)?.name ?? item.taskId,
      hours: item.seconds / 3600,
      amount: (item.seconds / 3600) * sheet.hourlyRate,
    }));
}

async function share(uri: string, title: string, mimeType: string, UTI: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available");
  await Sharing.shareAsync(uri, { dialogTitle: title, mimeType, UTI });
}

export async function shareSheetExcel(sheet: WorkSheet, tasks: GlobalTask[], sessions: WorkSession[]) {
  const rows = reportRows(sheet, tasks, sessions);
  const summary = workSheetSummary(sheet, sessions);
  const data: (string | number)[][] = [
    ["الشيت", sheet.title], ["من", sheet.from, "إلى", sheet.to],
    ["المهمة", "الساعات", "سعر الساعة", "العملة", "القيمة"],
    ...rows.map(row => [row.task, Number(row.hours.toFixed(4)), sheet.hourlyRate, sheet.currency, Number(row.amount.toFixed(2))]),
    [], ["عدد المهمات", summary.taskCount],
    ["إجمالي الساعات", Number(summary.hours.toFixed(4)), "الإجمالي", Number(summary.total.toFixed(2)), sheet.currency],
  ];
  const cell = (value: string | number) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${htmlEscape(value)}</Data></Cell>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="التقرير"><Table>${data.map(row => `<Row>${row.map(cell).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
  const file = new File(Paths.cache, `${safeFileName(sheet.title)}.xls`);
  if (file.exists) file.delete();
  file.create();
  file.write(xml);
  await share(file.uri, sheet.title, "application/vnd.ms-excel", "com.microsoft.excel.xls");
}

export async function shareSheetPdf(sheet: WorkSheet, tasks: GlobalTask[], sessions: WorkSession[]) {
  const rows = reportRows(sheet, tasks, sessions);
  const summary = workSheetSummary(sheet, sessions);
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
  <style>@page{margin:28px}body{font-family:Arial,sans-serif;color:#17202a;padding:8px}h1{color:#174d3a}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccd4d0;padding:9px;text-align:right}th{background:#e5f7ec}.summary{display:flex;gap:12px;margin:18px 0}.box{padding:12px;background:#f1f5f3;border-radius:8px;flex:1}.muted{color:#5e6d66}</style></head><body>
  <h1>${htmlEscape(sheet.title)}</h1><p class="muted">من ${htmlEscape(sheet.from)} إلى ${htmlEscape(sheet.to)}</p>
  <div class="summary"><div class="box">المهمات: ${summary.taskCount}</div><div class="box">الساعات: ${summary.hours.toFixed(2)}</div><div class="box">الإجمالي: ${summary.total.toFixed(2)} ${sheet.currency}</div></div>
  <table><thead><tr><th>المهمة</th><th>إجمالي الساعات</th><th>القيمة</th></tr></thead><tbody>
  ${rows.map(row => `<tr><td>${htmlEscape(row.task)}</td><td>${row.hours.toFixed(2)}</td><td>${row.amount.toFixed(2)} ${sheet.currency}</td></tr>`).join("")}
  </tbody></table></body></html>`;
  const result = await Print.printToFileAsync({ html });
  const file = new File(Paths.cache, `${safeFileName(sheet.title)}.pdf`);
  if (file.exists) file.delete();
  new File(result.uri).copy(file);
  await share(file.uri, sheet.title, "application/pdf", "com.adobe.pdf");
}
