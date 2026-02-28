const LoadingBlob = () => {
  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden">
      {/* Blob 1 */}
      <div
        className="absolute w-64 h-64 rounded-full animate-blob opacity-60"
        style={{
          background: 'hsl(105 40% 85%)',
          filter: 'blur(40px)',
          top: '20%',
          left: '20%',
        }}
      />
      {/* Blob 2 */}
      <div
        className="absolute w-48 h-48 rounded-full animate-blob opacity-60"
        style={{
          background: 'hsl(20 72% 85%)',
          filter: 'blur(40px)',
          bottom: '20%',
          right: '20%',
          animationDelay: '2s',
        }}
      />
      {/* Blob 3 */}
      <div
        className="absolute w-40 h-40 rounded-full animate-blob opacity-40"
        style={{
          background: 'hsl(107 22% 39% / 0.3)',
          filter: 'blur(30px)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animationDelay: '4s',
        }}
      />
    </div>
  );
};

export default LoadingBlob;
