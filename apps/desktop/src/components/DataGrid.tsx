import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface DataGridProps {
  rowData: any[];
}

export const DataGrid: React.FC<DataGridProps> = ({ rowData }) => {
  const columnDefs = useMemo(() => {
    if (rowData.length === 0) return [];
    return Object.keys(rowData[0]).map(key => ({
      field: key,
      sortable: true,
      filter: true,
      resizable: true,
    }));
  }, [rowData]);

  return (
    <div className="ag-theme-alpine-dark w-full h-full">
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        animateRows={true}
      />
    </div>
  );
};
