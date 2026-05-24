import WidgetKit
import SwiftUI

struct CaptureEntry: TimelineEntry {
    let date: Date
}

struct CaptureProvider: TimelineProvider {
    func placeholder(in context: Context) -> CaptureEntry {
        CaptureEntry(date: Date())
    }
    func getSnapshot(in context: Context, completion: @escaping (CaptureEntry) -> Void) {
        completion(CaptureEntry(date: Date()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<CaptureEntry>) -> Void) {
        completion(Timeline(entries: [CaptureEntry(date: Date())], policy: .never))
    }
}

struct CaptureWidgetView: View {
    var entry: CaptureEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Link(destination: URL(string: "questadi://capture")!) {
            switch family {
            case .accessoryCircular:
                Image(systemName: "quote.opening")
                    .font(.title2)
            default:
                HStack(spacing: 6) {
                    Image(systemName: "quote.opening")
                    Text("capture a quote").font(.caption2)
                    Spacer()
                }
                .padding(.horizontal, 8)
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

@main
struct QuestaCaptureWidget: Widget {
    let kind = "QuestaCaptureWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CaptureProvider()) { entry in
            CaptureWidgetView(entry: entry)
        }
        .configurationDisplayName("Capture a Quote")
        .description("Tap to capture a quote instantly.")
        .supportedFamilies([.accessoryRectangular, .accessoryCircular])
    }
}
