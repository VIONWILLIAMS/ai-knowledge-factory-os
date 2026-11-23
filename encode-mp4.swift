import AppKit
import AVFoundation
import Foundation

enum EncodeError: Error, CustomStringConvertible {
    case invalidArguments
    case noFrames
    case cannotCreateWriter(String)
    case cannotAddInput
    case cannotCreatePixelBuffer
    case cannotCreateContext
    case cannotLoadImage(String)
    case cannotCreateCGImage(String)
    case appendFailed
    case writerFailed(String)

    var description: String {
        switch self {
        case .invalidArguments:
            return "Usage: swift encode-mp4.swift <framesDir> <fps> <width> <height> <outputPath>"
        case .noFrames:
            return "No JPEG frames found."
        case .cannotCreateWriter(let message):
            return "Cannot create AVAssetWriter: \(message)"
        case .cannotAddInput:
            return "Cannot add video input."
        case .cannotCreatePixelBuffer:
            return "Cannot create pixel buffer."
        case .cannotCreateContext:
            return "Cannot create CGContext."
        case .cannotLoadImage(let path):
            return "Cannot load image: \(path)"
        case .cannotCreateCGImage(let path):
            return "Cannot create CGImage: \(path)"
        case .appendFailed:
            return "Cannot append pixel buffer."
        case .writerFailed(let message):
            return "AVAssetWriter failed: \(message)"
        }
    }
}

func fail(_ error: Error) -> Never {
    FileHandle.standardError.write("\(error)\n".data(using: .utf8)!)
    exit(1)
}

func makePixelBuffer(from cgImage: CGImage, width: Int, height: Int, pool: CVPixelBufferPool) throws -> CVPixelBuffer {
    var maybeBuffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool, &maybeBuffer)
    guard let buffer = maybeBuffer else { throw EncodeError.cannotCreatePixelBuffer }

    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

    guard let context = CGContext(
        data: CVPixelBufferGetBaseAddress(buffer),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    ) else {
        throw EncodeError.cannotCreateContext
    }

    context.interpolationQuality = .high
    context.setFillColor(NSColor(calibratedRed: 0.07, green: 0.09, blue: 0.15, alpha: 1).cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

    return buffer
}

func run() throws {
    let args = CommandLine.arguments
    guard args.count == 6,
          let fps = Int32(args[2]),
          let width = Int(args[3]),
          let height = Int(args[4]) else {
        throw EncodeError.invalidArguments
    }

    let framesDir = URL(fileURLWithPath: args[1], isDirectory: true)
    let outputURL = URL(fileURLWithPath: args[5])
    let files = try FileManager.default.contentsOfDirectory(
        at: framesDir,
        includingPropertiesForKeys: nil,
        options: [.skipsHiddenFiles]
    )
    .filter { $0.lastPathComponent.hasPrefix("frame_") && $0.pathExtension.lowercased() == "jpg" }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

    guard !files.isEmpty else { throw EncodeError.noFrames }
    try? FileManager.default.removeItem(at: outputURL)

    let writer: AVAssetWriter
    do {
        writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
    } catch {
        throw EncodeError.cannotCreateWriter(error.localizedDescription)
    }

    let outputSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: max(4_000_000, width * height * 5),
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
        ]
    ]

    let input = AVAssetWriterInput(mediaType: .video, outputSettings: outputSettings)
    input.expectsMediaDataInRealTime = false
    guard writer.canAdd(input) else { throw EncodeError.cannotAddInput }
    writer.add(input)

    let attributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height
    ]
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: attributes
    )

    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    guard let pool = adaptor.pixelBufferPool else { throw EncodeError.cannotCreatePixelBuffer }

    for (index, file) in files.enumerated() {
        while !input.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.004)
        }

        try autoreleasepool {
            guard let image = NSImage(contentsOf: file) else {
                throw EncodeError.cannotLoadImage(file.path)
            }
            var rect = CGRect(origin: .zero, size: image.size)
            guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
                throw EncodeError.cannotCreateCGImage(file.path)
            }
            let buffer = try makePixelBuffer(from: cgImage, width: width, height: height, pool: pool)
            let time = CMTime(value: CMTimeValue(index), timescale: fps)
            guard adaptor.append(buffer, withPresentationTime: time) else {
                throw EncodeError.appendFailed
            }
        }
    }

    input.markAsFinished()

    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting {
        semaphore.signal()
    }
    semaphore.wait()

    if writer.status != .completed {
        throw EncodeError.writerFailed(writer.error?.localizedDescription ?? "unknown error")
    }
}

do {
    try run()
} catch {
    fail(error)
}
