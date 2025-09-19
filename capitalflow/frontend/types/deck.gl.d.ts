declare module '@deck.gl/react' {
  import { Component } from 'react'
  
  export interface DeckGLProps {
    viewState?: any
    onViewStateChange?: (params: any) => void
    controller?: boolean | any
    layers?: any[]
    getTooltip?: (info: any) => any
    children?: React.ReactNode
    [key: string]: any
  }
  
  export default class DeckGL extends Component<DeckGLProps> {}
}

declare module '@deck.gl/layers' {
  export class GeoJsonLayer {
    constructor(props: any)
  }
  
  export class ArcLayer {
    constructor(props: any)
  }
}

declare module '@deck.gl/core' {
  export class Layer {
    constructor(props: any)
  }
}

declare module '@deck.gl/geo-layers' {
  export * from '@deck.gl/layers'
}
