import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry {
        WidgetEntry(date: Date(), streak: 0, totalEntries: 0, totalWords: 0, todayWritten: false, lastEntryDate: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) {
        let entry = loadData() ?? placeholder(in: context)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let entry = loadData() ?? placeholder(in: context)
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: entry.date) ?? entry.date
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadData() -> WidgetEntry? {
        let appGroup = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.mindflow.app")
        guard let url = appGroup?.appendingPathComponent("Library/widget-data.json") else { return nil }
        guard let data = try? Data(contentsOf: url) else { return nil }
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }

        return WidgetEntry(
            date: (json["updatedAt"] as? String).flatMap { ISO8601DateFormatter().date(from: $0) } ?? Date(),
            streak: json["streak"] as? Int ?? 0,
            totalEntries: json["totalEntries"] as? Int ?? 0,
            totalWords: json["totalWords"] as? Int ?? 0,
            todayWritten: json["todayWritten"] as? Bool ?? false,
            lastEntryDate: json["lastEntryDate"] as? String
        )
    }
}

struct WidgetEntry: TimelineEntry {
    let date: Date
    let streak: Int
    let totalEntries: Int
    let totalWords: Int
    let todayWritten: Bool
    let lastEntryDate: String?
}

struct MindFlowWidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "square.and.pencil")
                    .font(.caption)
                    .foregroundColor(.accentColor)
                Text("MindFlow")
                    .font(.headline)
                    .fontWeight(.bold)
            }

            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(entry.streak)")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.accentColor)
                    Text("Day Streak")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("\(entry.totalEntries)")
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Entries")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            HStack {
                Circle()
                    .fill(entry.todayWritten ? Color.green : Color.gray.opacity(0.5))
                    .frame(width: 8, height: 8)
                Text(entry.todayWritten ? "Written today" : "Not yet written")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
    }
}

@main
struct MindFlowWidget: Widget {
    let kind: String = "com.mindflow.widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MindFlowWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("MindFlow Streak")
        .description("Track your journal streak and stats at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
