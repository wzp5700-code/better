declare module "react-calendar-heatmap" {
  import * as React from "react"

  export interface HeatmapValue {
    date: string | Date
    count?: number
    value?: number | string
  }

  export interface CalendarHeatmapProps {
    startDate?: string | Date
    endDate?: string | Date
    values?: HeatmapValue[]
    classForValue?: (value: HeatmapValue) => string | undefined
    titleForValue?: (value: HeatmapValue) => string | undefined
    showWeekdayLabels?: boolean
    gutterSize?: number
    horizontal?: boolean
    onClick?: (value: HeatmapValue | null) => void
    onMouseOver?: (event: React.MouseEvent<SVGRectElement>, value: HeatmapValue) => void
    onMouseLeave?: (event: React.MouseEvent<SVGRectElement>) => void
    transformDayElement?: (
      element: React.ReactElement<Record<string, unknown>>,
      value: HeatmapValue
    ) => React.ReactElement
    className?: string
  }

  const CalendarHeatmap: React.FC<CalendarHeatmapProps>
  export default CalendarHeatmap
}