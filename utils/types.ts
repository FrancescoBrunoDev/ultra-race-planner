export interface ElevationPoint {
    distance: number;  // in km
    elevation: number; // in m
}

export interface ChartDataset {
    label: string;
    data: number[];
    fill: boolean;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    tension: number;
}
