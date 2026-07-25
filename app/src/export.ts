const BLUE = "0B57D0";
const LIGHT_BLUE = "E8F0FE";
const BORDER = "D9E2F1";

export async function buildMatchXlsx(match: MatchRecord, teamName: string) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Peluutin";
  workbook.created = new Date(match.playedAt);

  const sheet = workbook.addWorksheet("Ottelu", {
    views: [{ state: "frozen", ySplit: 9, showGridLines: false }],
  });

  sheet.columns = [
    { key: "number", width: 16 },
    { key: "player", width: 30 },
    { key: "minutes", width: 17 },
    { key: "goals", width: 11 },
  ];

  sheet.mergeCells("A1:D1");
  const title = sheet.getCell("A1");
  title.value = "Otteluraportti";
  title.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 16 };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BLUE}` } };
  title.alignment = { horizontal: "left", vertical: "middle" };
  sheet.getRow(1).height = 28;

  const homeName = match.venue === "away" ? match.opponent : teamName;
  const awayName = match.venue === "away" ? teamName : match.opponent;
  const details = [
    ["Oma joukkue", teamName],
    ["Ottelu", `${homeName} – ${awayName}`],
    ["Päivä", new Date(match.playedAt).toLocaleString("fi-FI", { dateStyle: "short", timeStyle: "short" })],
    ["Tulos", `${match.score[0]}–${match.score[1]}`],
    ["Kesto", match.duration / 86400],
  ];
  details.forEach(([label, value], index) => {
    const row = index + 3;
    sheet.getCell(row, 1).value = label;
    sheet.getCell(row, 2).value = value;
    sheet.getCell(row, 1).font = { bold: true, color: { argb: `FF${BLUE}` } };
    sheet.getCell(row, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${LIGHT_BLUE}` } };
    sheet.getCell(row, 1).alignment = { vertical: "middle" };
    sheet.getCell(row, 2).alignment = { horizontal: "left", vertical: "middle" };
    sheet.getRow(row).height = 21;
  });
  sheet.getCell("B7").numFmt = "[h]:mm";

  const headerRow = sheet.getRow(9);
  headerRow.values = ["Numero", "Pelaaja", "Peliminuutit", "Maalit"];
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BLUE}` } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: `FF${BORDER}` } } };
  });

  match.players.forEach((player, index) => {
    const row = sheet.addRow([player.number, player.name, player.seconds / 60, player.goals]);
    row.height = 21;
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(3).numFmt = "0.0";
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F9FC" } };
      });
    }
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: `FF${BORDER}` } } };
    });
  });

  return workbook.xlsx.writeBuffer();
}
import type { MatchRecord } from "./types";
