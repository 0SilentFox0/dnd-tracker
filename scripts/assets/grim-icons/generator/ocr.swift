import Foundation
import Vision
import AppKit
for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    try? VNImageRequestHandler(cgImage: cg).perform([req])
    let hits = (req.results ?? []).compactMap { $0.topCandidates(1).first }.filter { $0.confidence > 0.3 && $0.string.filter { $0.isLetter }.count >= 3 }
    if !hits.isEmpty { print((path as NSString).lastPathComponent + ": " + hits.map { "\($0.string)(\(String(format: "%.2f", $0.confidence)))" }.joined(separator: " | ")) }
}
