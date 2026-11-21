import type { BookTable as TableModel } from './model';
export function BookTable({ table, caption }: { table: TableModel; caption: string }) {
  return <div className="book-table-wrap" role="region" aria-label={caption} tabIndex={0}>
    <table><caption>{caption}</caption><thead><tr>{table.headers.map((h, i) => <th scope="col" key={i}>{h || 'Вариант'}</th>)}</tr></thead>
      <tbody>{table.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0
        ? <th scope="row" key={j}>{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
