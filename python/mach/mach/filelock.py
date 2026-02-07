# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

import errno
import os
import sys
import time
from pathlib import Path


class LockTimeout(Exception):
    """Raised when a lock cannot be acquired within the timeout period."""

    def __init__(self, lock_file):
        self.lock_file = lock_file
        super().__init__(f"Timeout waiting for lock file: {lock_file}")


def _is_pid_alive(pid):
    """Check if a process with the given PID is still running."""
    try:
        if sys.platform == "win32":
            # os.kill(pid, 0) is unreliable on Windows
            import ctypes

            PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
            handle = ctypes.windll.kernel32.OpenProcess(
                PROCESS_QUERY_LIMITED_INFORMATION, False, pid
            )
            if handle:
                ctypes.windll.kernel32.CloseHandle(handle)
                return True
            return False
        else:
            os.kill(pid, 0)
            return True
    except OSError as e:
        if e.errno == errno.ESRCH:  # No such process
            return False
        if e.errno == errno.EPERM:  # Permission denied, but the process exists
            return True
        raise


class SoftFileLock:
    """A simple cross-platform file lock using exclusive file creation."""

    def __init__(self, lock_file, timeout=-1):
        self.lock_file = Path(lock_file)
        self.timeout = timeout
        self._lock_held = False

    def _is_lock_stale(self):
        """Check if the existing lock file is stale (owning process no longer exists)."""
        try:
            content = self.lock_file.read_text().strip()
            if not content:
                # Empty file is invalid/stale
                return True
            pid = int(content)
            return not _is_pid_alive(pid)
        except ValueError:
            # Can't parse PID, treat as stale
            return True
        except OSError:
            # Can't read the file, may be a race condition, assume it's not stale to be safe
            return False

    def _try_remove_stale_lock(self):
        """Attempt to remove a stale lock file. Returns True if removed."""
        if not self._is_lock_stale():
            return False
        try:
            self.lock_file.unlink()
            return True
        except OSError:
            # Race condition, another process did what we're trying to do. We failed, so we wait.
            return False

    def acquire(self, timeout=None):
        """Acquire the lock, blocking until available or timeout is reached."""
        assert not self._lock_held, "acquire() is not reentrant"

        if timeout is None:
            timeout = self.timeout

        start_time = time.monotonic()
        poll_interval = 0.1

        self.lock_file.parent.mkdir(parents=True, exist_ok=True)
        while True:
            try:
                with self.lock_file.open("x") as f:
                    # Write PID for stale lock detection
                    f.write(f"{os.getpid()}\n")
                self._lock_held = True
                return self
            except OSError as e:
                # FileExistsError (EEXIST) or Windows EACCES means lock is held
                if e.errno not in (errno.EEXIST, errno.EACCES):
                    raise
                if e.errno == errno.EACCES and sys.platform != "win32":
                    raise
                # Check if the lock is stale before waiting
                if self._try_remove_stale_lock():
                    continue
                if timeout >= 0 and time.monotonic() - start_time >= timeout:
                    raise LockTimeout(self.lock_file)
                time.sleep(poll_interval)
                poll_interval = min(poll_interval * 1.5, 1.0)

    def release(self):
        """Release the lock by deleting the lock file."""
        if not self._lock_held:
            return
        while True:
            try:
                self.lock_file.unlink()
                self._lock_held = False
                break
            except OSError as e:
                if e.errno == errno.EACCES:
                    # On Windows, another process may have the file open we'll retry.
                    # Just a short sleep since we want to drop the lock ASAP
                    # (but we need to let some other process close the file
                    # first).
                    time.sleep(0.1)
                elif e.errno == errno.ENOENT:
                    # Already deleted
                    self._lock_held = False
                    break
                else:
                    raise

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return False
