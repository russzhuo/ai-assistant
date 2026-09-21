"use client";

import { useSyncExternalStore } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "./Button";

const emptySubscribe = () => () => {};

const Header: React.FC = () => {
  // Hydration-safe "is mounted" check: false on the server and during the first
  // client render, true once hydrated. Clerk's SignedIn/SignedOut/UserButton
  // render differently on server vs client, so defer them until after hydration.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (
    <header className="flex items-center justify-end px-2 space-x-4 py-2">
      {!mounted ? null : (
        <>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </SignInButton>

            <SignUpButton mode="modal">
              <Button size="sm">Sign up</Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-9",
                },
              }}
            />
          </SignedIn>
        </>
      )}
    </header>
  );
};

export default Header;
