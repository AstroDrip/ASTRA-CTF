import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SimulatedPacket } from '../../types';
import { X, Radio, Filter, Eye, RefreshCw } from 'lucide-react';

export const NetworkViewerModal: React.FC = () => {
  const { activeSimulatedTool, activeToolParams, closeSimulatedTool } = useApp();
  const [packets, setPackets] = useState<SimulatedPacket[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<SimulatedPacket | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeSimulatedTool === 'network') {
      const initialFilter = activeToolParams?.filter || 'ALL';
      setActiveFilter(initialFilter);
      fetchPackets(initialFilter);
    }
  }, [activeSimulatedTool, activeToolParams]);

  const fetchPackets = async (filter: string) => {
    setLoading(true);
    try {
      const url = filter === 'ALL' ? '/api/simulated/packets' : `/api/simulated/packets?filter=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setPackets(data.packets || []);
      if (data.packets?.length > 0) {
        setSelectedPacket(data.packets[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (f: string) => {
    setActiveFilter(f);
    fetchPackets(f);
  };

  if (activeSimulatedTool !== 'network') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div 
        id="simulated-network-dialog"
        className="flex h-[84vh] w-full max-w-5xl flex-col border border-[#1b2129] bg-[#07090b] shadow-2xl"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b border-[#1b2129] bg-[#0d1015] px-4 py-2.5">
          <div className="flex items-center space-x-2">
            <Radio className="h-4 w-4 text-[#a78bfa]" />
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              NETWORK PROTOCOL ANALYZER // CAPTURE: eth0_0312.pcap
            </span>
          </div>
          <button onClick={closeSimulatedTool} className="text-[#9ca3af] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between border-b border-[#1b2129] bg-[#0a0d11] px-4 py-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-3.5 w-3.5 text-[#6b7280]" />
            <span className="font-mono text-xs text-[#6b7280]">FILTER:</span>
            {['ALL', 'DNS', 'HTTP', 'TLS', 'ECHO_SYNC', 'ICMP'].map((proto) => (
              <button
                key={proto}
                onClick={() => handleFilterChange(proto)}
                className={`px-2 py-0.5 font-mono text-[10px] uppercase transition-colors ${
                  activeFilter === proto
                    ? 'border border-[#a78bfa] bg-[#a78bfa]/20 font-bold text-[#a78bfa]'
                    : 'text-[#9ca3af] hover:text-white'
                }`}
              >
                {proto}
              </button>
            ))}
          </div>

          <div className="font-mono text-[10px] text-[#6b7280]">
            {packets.length} FRAMES MATCHED
          </div>
        </div>

        {/* Packet Stream Grid */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top: Packet List Table */}
          <div className="h-1/2 overflow-y-auto border-b border-[#1b2129] bg-[#07090b]">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="sticky top-0 bg-[#0d1015] text-[#6b7280] border-b border-[#1b2129]">
                <tr>
                  <th className="px-3 py-1.5 w-14">NO.</th>
                  <th className="px-3 py-1.5 w-24">TIME</th>
                  <th className="px-3 py-1.5 w-32">SOURCE</th>
                  <th className="px-3 py-1.5 w-32">DESTINATION</th>
                  <th className="px-3 py-1.5 w-24">PROTOCOL</th>
                  <th className="px-3 py-1.5 w-16">LEN</th>
                  <th className="px-3 py-1.5">INFO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#12161e]">
                {packets.map((pkt) => {
                  const isSelected = selectedPacket?.frameNumber === pkt.frameNumber;
                  return (
                    <tr
                      key={pkt.frameNumber}
                      onClick={() => setSelectedPacket(pkt)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#1b1c2b] text-[#ccff00]'
                          : 'hover:bg-[#0c0f14] text-[#d1d5db]'
                      }`}
                    >
                      <td className="px-3 py-1.5 text-[#6b7280]">{pkt.frameNumber}</td>
                      <td className="px-3 py-1.5">{pkt.timestamp}</td>
                      <td className="px-3 py-1.5">{pkt.sourceIp}</td>
                      <td className="px-3 py-1.5">{pkt.destIp}</td>
                      <td className="px-3 py-1.5 font-bold text-[#00f0ff]">{pkt.protocol}</td>
                      <td className="px-3 py-1.5 text-[#6b7280]">{pkt.length}</td>
                      <td className="px-3 py-1.5 truncate max-w-[320px]">{pkt.info}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom: Packet Details & Hex/ASCII Inspector */}
          <div className="flex-1 bg-[#090b0e] p-4 overflow-y-auto font-mono text-xs">
            {selectedPacket ? (
              <div className="space-y-3">
                <div className="border border-[#1b2129] bg-[#0c0f14] p-3 text-[11px] text-[#9ca3af]">
                  <div className="text-white font-bold mb-1">
                    FRAME #{selectedPacket.frameNumber} // {selectedPacket.protocol} PACKET DETAILS
                  </div>
                  <div>Source: {selectedPacket.sourceIp} &rarr; Destination: {selectedPacket.destIp}</div>
                  <div>Timestamp: {selectedPacket.timestamp} | Payload Length: {selectedPacket.length} bytes</div>
                  <div className="text-[#a78bfa] mt-1">Summary: {selectedPacket.info}</div>
                </div>

                {/* Hex & ASCII Payload Dump */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-[#1b2129] bg-[#050709] p-3">
                    <span className="text-[10px] text-[#6b7280] block mb-1">HEXADECIMAL STREAM:</span>
                    <pre className="text-[11px] text-[#ccff00] whitespace-pre-wrap break-all">
                      {selectedPacket.payloadHex}
                    </pre>
                  </div>

                  <div className="border border-[#1b2129] bg-[#050709] p-3">
                    <span className="text-[10px] text-[#6b7280] block mb-1">ASCII DECODED STRING:</span>
                    <pre className="text-[11px] text-[#00f0ff] whitespace-pre-wrap break-all">
                      {selectedPacket.payloadAscii}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[#6b7280]">
                Select a network packet above to inspect payload
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1b2129] bg-[#0d1015] px-4 py-1.5 font-mono text-[10px] text-[#6b7280] flex justify-between">
          <span>KMCT CAMPUS PERIMETER TAP // NOISE REDUCTION ENGINE ACTIVE</span>
          <span>PCAP v2.4</span>
        </div>
      </div>
    </div>
  );
};
