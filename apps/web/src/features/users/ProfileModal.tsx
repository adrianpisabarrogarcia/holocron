import { FormEvent, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { User, X, Camera, Loader2, UserCircle } from 'lucide-react';
import { fieldClassName } from '../../lib/constants';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getApiUrl } from '../../lib/api';
import { compressImageToWebp } from '../board/AttachmentsSection';

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateProfile } = useAuthStore();
  const { uploadFile } = useBoardStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEscapeKey(onClose, isOpen);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-200', text: 'text-slate-400' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 1:
        return { score, label: 'Muy Débil', color: 'bg-rose-500', text: 'text-rose-500' };
      case 2:
        return { score, label: 'Débil', color: 'bg-amber-500', text: 'text-amber-500' };
      case 3:
        return { score, label: 'Media', color: 'bg-indigo-500', text: 'text-indigo-500' };
      case 4:
        return { score, label: 'Fuerte', color: 'bg-emerald-500', text: 'text-emerald-500' };
      default:
        return { score: 0, label: 'Muy Débil', color: 'bg-rose-500', text: 'text-rose-500' };
    }
  }, [password]);

  if (!isOpen || !user) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setErrorMsg(null);
    try {
      if (file.type.startsWith('image/')) {
        const base64Data = await compressImageToWebp(file, 200);
        const dotIdx = file.name.lastIndexOf('.');
        const filename = (dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name) + '.webp';
        
        const { url } = await uploadFile(filename, base64Data);
        setAvatarUrl(url);
      } else {
        setErrorMsg("Por favor selecciona una imagen válida.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password && password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    try {
      await updateProfile(name, avatarUrl, password || undefined);
      setSuccessMsg("Perfil actualizado correctamente.");
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setPending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4 w-screen h-screen">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200 outline-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <CardHeader className="p-0 mb-4 flex flex-row items-center gap-3">
          <User className="h-5 w-5 text-indigo-650" />
          <div>
            <CardTitle className="text-base">Mi Perfil</CardTitle>
            <CardDescription>Configura tus datos de cuenta y contraseña</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800/40">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="relative group h-20 w-20 rounded-full overflow-hidden border-2 border-indigo-100 dark:border-indigo-900 bg-slate-50 dark:bg-slate-955 flex items-center justify-center shadow-md shrink-0">
                {avatarUploading ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                ) : avatarUrl ? (
                  <img
                    src={getApiUrl(avatarUrl)}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-12 w-12 text-slate-400" />
                )}
                
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-[10px] text-white font-bold gap-1 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>CAMBIAR</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-450 dark:text-slate-555 font-bold uppercase tracking-wider">Foto de Perfil</span>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/35 rounded-lg p-2.5">{errorMsg}</p>
            )}

            {successMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-455 font-bold bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 rounded-lg p-2.5">{successMsg}</p>
            )}

            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Nombre completo (No editable)</span>
              <input
                className={`${fieldClassName} opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900`}
                disabled
                type="text"
                value={name}
              />
            </label>

            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Email (No editable)</span>
              <input
                className={`${fieldClassName} opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900`}
                disabled
                type="email"
                value={user.email}
              />
            </label>

            <div className="border-t border-slate-100 dark:border-slate-800/40 pt-4 space-y-3">
              <span className="text-xs font-bold text-slate-450 dark:text-slate-555 uppercase tracking-wider block">Cambiar Contraseña</span>
              
              <label className="block text-sm text-slate-655 dark:text-slate-355">
                <span className="mb-1 block font-medium">Nueva Contraseña</span>
                <input
                  className={fieldClassName}
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Dejar en blanco para no cambiar"
                />
              </label>

              {/* Password strength indicator */}
              {password && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-400 dark:text-slate-550 uppercase">Seguridad:</span>
                    <span className={`font-black ${passwordStrength.text}`}>{passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                    <div className={`h-full flex-1 ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 ${passwordStrength.score >= 4 ? passwordStrength.color : 'bg-transparent'}`} />
                  </div>
                </div>
              )}

              <label className="block text-sm text-slate-655 dark:text-slate-355">
                <span className="mb-1 block font-medium">Confirmar Nueva Contraseña</span>
                <input
                  className={fieldClassName}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  required={!!password}
                />
              </label>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] font-bold text-rose-500">❌ Las contraseñas no coinciden.</p>
              )}
              {password && confirmPassword && password === confirmPassword && (
                <p className="text-[10px] font-bold text-emerald-500">✅ Las contraseñas coinciden.</p>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button
                className="text-white"
                variant="primary"
                disabled={pending || (!!password && (password !== confirmPassword || password.length < 8))}
                type="submit"
              >
                {pending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>,
    document.body
  );
}
