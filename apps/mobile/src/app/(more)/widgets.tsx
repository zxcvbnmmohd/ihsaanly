import { WidgetsScreen } from '@ihsaanly/ui/screens/widgets'
import type { ReactElement } from 'react'
import { Platform } from 'react-native'
import { useWidgetPreview } from '@/widgets/use-preview'

/**
 * More → Widgets, also opened as `ihsaanly://widgets` (`WIDGET_GALLERY_HREF`
 * in `@ihsaanly/ui/props/more`). The previews are the widgets' current entry.
 */
export default function WidgetsRoute(): ReactElement {
  return (
    <WidgetsScreen
      model={useWidgetPreview()}
      platform={Platform.OS === 'android' ? 'android' : 'ios'}
    />
  )
}
